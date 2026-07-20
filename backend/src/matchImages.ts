/**
 * Match cover images. Every match gets a generated placeholder banner by default (pure
 * SVG templating, no external calls, no native deps like sharp/canvas) so the pipeline
 * is fully working out of the box. An admin can override any match with a real
 * `imageUrl` via PUT /admin/matches/:id (see adminMatches.ts / matchMetadataStore.ts),
 * which takes precedence and skips generation entirely.
 *
 * To swap in a real generator (e.g. an AI image API): replace the body of
 * `generateMatchImageSvg` below with your own call, keeping the same signature. Results
 * are cached to disk keyed by match id and only regenerated when the input (team names)
 * changes, so a real paid API only gets called once per match rather than once per
 * request. In-flight generation is de-duped per id so concurrent requests for the same
 * uncached match don't trigger duplicate work.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getMetadata } from "./matchMetadataStore";

const MEDIA_DIR = path.resolve(__dirname, "..", "media", "matches");

export interface MatchImageInput {
  teamA: string;
  teamB: string;
  /** Short label shown on the banner, e.g. a round or competition name. */
  label: string;
}

// Deterministic per-matchup palette so the same pairing always renders the same way
// (and different matchups visibly differ) without any external image dependency.
const PALETTES: Array<{ from: string; to: string; accent: string }> = [
  { from: "#0d4d3a", to: "#082e23", accent: "#8fe3b0" },
  { from: "#0d3d5c", to: "#082438", accent: "#7ec8ff" },
  { from: "#3d1f6b", to: "#251142", accent: "#c9a8ff" },
  { from: "#6b1f3d", to: "#421125", accent: "#ff9ab5" },
  { from: "#6b4a1f", to: "#422d11", accent: "#ffcb7a" },
  { from: "#3d3115", to: "#161206", accent: "#ffd447" },
];

function paletteFor(teamA: string, teamB: string) {
  const hash = crypto.createHash("md5").update(`${teamA}|${teamB}`).digest();
  return PALETTES[hash[0] % PALETTES.length];
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

/** Default generator: a deterministic 800x450 abstract banner (diagonal color field +
 * a ring motif) rather than team names spelled out — this image is mainly composited as
 * a backdrop *behind* card art that already renders the team names itself (see
 * CollectionCardArt.tsx / MomentCardArt.tsx), so duplicating that text here just competes
 * with it. It still stands alone fine as an admin-table thumbnail. This is the plug-in
 * point described above — swap the body for a real image-generation call and return the
 * raw bytes (any format) instead, adjusting the `.svg` extension in ensureMatchImage if
 * you do; a real photo won't have this text-collision problem. */
async function generateMatchImageSvg(input: MatchImageInput): Promise<Buffer> {
  const { from, to, accent } = paletteFor(input.teamA, input.teamB);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)" />
  <polygon points="800,0 800,450 500,450" fill="#ffffff0d" />
  <circle cx="620" cy="150" r="220" fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="3" />
  <circle cx="620" cy="150" r="140" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="3" />
  <text x="36" y="410" fill="${accent}" font-size="18" font-weight="800" letter-spacing="3" font-family="Arial, sans-serif" opacity="0.85">${escapeXml(input.label.toUpperCase())}</text>
  <text x="36" y="60" fill="#ffffff" font-size="16" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif" opacity="0.55">${escapeXml(input.teamA)} · ${escapeXml(input.teamB)}</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

function cachePath(id: string): string {
  return path.join(MEDIA_DIR, `${encodeURIComponent(id)}.svg`);
}

const UPLOAD_DIR = path.resolve(__dirname, "..", "media", "uploads");
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** Stores an admin-uploaded cover image (a real file, not a link to one) on disk and
 * returns the URL path to serve it at. Called from POST /admin/matches/:id/image; the
 * caller (adminMatches.ts) then runs the normal updateAdminMatch flow with this URL as
 * `imageUrl`, so an uploaded image is sealed on-chain exactly like a pasted one. Old
 * uploads for the same match id are left in place rather than deleted -- disk space is
 * cheap and it keeps prior uploads recoverable if an admin wants to revert. */
export function saveUploadedMatchImage(id: string, dataUrl: string): string {
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("imageData must be a base64 data URL (data:<mime>;base64,<data>)");
  const [, mime, base64] = match;
  const ext = ALLOWED_UPLOAD_TYPES[mime];
  if (!ext) throw new Error(`Unsupported image type: ${mime}. Allowed: ${Object.keys(ALLOWED_UPLOAD_TYPES).join(", ")}`);

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) throw new Error("Uploaded image is empty");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error(`Uploaded image exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`);

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${encodeURIComponent(id)}-${Date.now()}.${ext}`;
  const file = path.join(UPLOAD_DIR, filename);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, file);

  return `/media/uploads/${filename}`;
}

const inFlight = new Map<string, Promise<void>>();

/** Ensures a generated cover image exists on disk for `id`, generating it if missing.
 * Returns the URL path to serve it at (mounted under /media/matches — see server.ts).
 * Does not touch anything if the admin has set a custom imageUrl for this match; callers
 * should check the metadata overlay first and only fall back to this. */
export async function ensureGeneratedMatchImage(id: string, input: MatchImageInput): Promise<string> {
  const file = cachePath(id);
  if (!fs.existsSync(file)) {
    const pending =
      inFlight.get(id) ??
      (async () => {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
        const bytes = await generateMatchImageSvg(input);
        const tmp = `${file}.tmp`;
        fs.writeFileSync(tmp, bytes);
        fs.renameSync(tmp, file);
      })();
    inFlight.set(id, pending);
    try {
      await pending;
    } finally {
      inFlight.delete(id);
    }
  }
  return `/media/matches/${encodeURIComponent(id)}.svg`;
}

/** Image lookup for a live TxLINE-tracked fixture's Moment cards -- admin-curated
 * override if set, else the generated placeholder. Shared by server.ts's recordMoments
 * (algorithmic swing Moments) and matchEventMoments.ts (admin-reported event Moments) so
 * both land on the same cover art per fixture. Lives here rather than adminMatches.ts so
 * either caller can import it without a circular dependency on adminMatches.ts. */
export async function matchImageForFixture(fixtureId: number, teamA: string, teamB: string): Promise<string> {
  const id = `live-${fixtureId}`;
  const meta = getMetadata(id);
  return meta?.imageUrl ?? ensureGeneratedMatchImage(id, { teamA, teamB, label: "World Cup" });
}
