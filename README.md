# Moment

Moment is an on-chain World Cup 2026 gacha platform built on Solana. Every card is tied to something real: a live win-probability swing detected in an actual match, or a verified historical result — sealed on Solana devnet the instant it happens, never a client-side random roll.

Two packs are live today:

- **Event Pack** — reveals a real (or freshly auto-sealed) Moment with a referee/VAR-styled card face.
- **Match Pack** — the same real Moment pipeline, with a stadium-styled card face.

Both pull from the same queue of real live-match odds swings (a ≥20pt win-probability move, or the market favorite flipping), sourced from [TxLINE](https://txline-docs.txodds.com/)'s real-time odds feed. If nothing real is queued when you pay, the backend seals a fresh Moment on demand through the identical on-chain pipeline, so a pack is always available to open.

Every draw can be claimed as a real SPL NFT on devnet, then listed for sale or bought from anyone else on the built-in Marketplace.

## Project structure

- `app/` — React, TypeScript, Vite, and Tailwind frontend.
- `backend/` — Express + `ts-node` API. Authenticates with TxLINE, watches live odds, detects swings, seals Moments as devnet memo transactions, and serves fixtures/collection/moments data to the frontend.
- `programs/gacha-er/` — Anchor program: mints Moment (and Tarot card) NFTs, and runs the peer-to-peer marketplace (list / cancel / buy) with on-chain escrow.
- `Anchor.toml` — Anchor workspace configuration.

## How a draw actually works

1. **Live odds** flow from TxLINE into the backend (`backend/src/txlineClient.ts`), which detects swings (`swingDetector.ts`) and seals each one as a Solana devnet memo transaction (`sendMomentTx.ts`) — a permanent, publicly verifiable on-chain record.
2. The frontend polls `/moments/recent` for newly sealed Moments and queues them per pack.
3. Paying for a pack (`app/src/decks/worldcup/packPayment.ts`) sends a real devnet SOL transfer to the house treasury, then reveals whatever real Moment is queued — or seals a fresh one on demand (`/moments/simulate`) if none is.
4. A revealed Moment can be claimed as an NFT (`mint_moment_nft`), which mints an SPL token keyed by the Moment's own memo signature — first claimer wins.
5. Claimed NFTs can be listed for sale (`list_card`) from Profile, browsed on the Marketplace, and bought (`buy_card`) or the listing cancelled (`cancel_listing`) — all escrowed on-chain.

## Run locally

### Frontend

```bash
cd app
npm install
npm run dev
```

The local Vite server will print its URL (normally `http://localhost:5173`).

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in a devnet keypair path and TxLINE settings
npm run server
```

Runs on `http://localhost:8787` by default. The frontend reads `VITE_MOMENTS_API_URL` (defaults to that local URL) to reach it.

Required environment variables (see `backend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `SOLANA_RPC_URL` | Devnet RPC endpoint |
| `SOLANA_KEYPAIR_PATH` / `SOLANA_KEYPAIR_JSON` | House signer keypair — path for local dev, inline JSON array for hosts with no filesystem (e.g. Railway) |
| `TXLINE_PROGRAM_ID`, `TXLINE_TOKEN_MINT` | TxLINE's on-chain program/token addresses (public, safe to share) |
| `TXLINE_API_BASE_URL`, `TXLINE_JWT_URL` | TxLINE API endpoints |
| `TXLINE_SERVICE_LEVEL`, `TXLINE_DURATION_WEEKS` | TxLINE subscription tier |
| `ADMIN_PASSWORD` | Enables the admin match-curation routes (`/admin/*`); left unset, those routes stay disabled but everything else runs |
| `DISABLE_LIVE_WATCHER` | Set `true` to skip the background live-odds watcher (the `/moments/simulate` demo trigger still works) |

### Solana program

Install Rust, the Solana CLI, and the Anchor CLI first. Then, from the repo root:

```bash
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## API surface (backend)

- `GET /fixtures` — every fixture TxLINE's tier has seen, with the latest win-probability snapshot.
- `GET /collection` — the full World Cup 2026 knockout collection (verified results + live-tracked fixtures).
- `GET /moments/recent` — recently sealed Moments.
- `POST /moments/simulate` — seals a fresh demo Moment on demand (used when no real swing is queued).
- `POST /admin/login`, plus `GET|PUT /admin/matches*` — admin match-metadata curation (requires `ADMIN_PASSWORD`).

## Frontend commands

Run these from `app/`:

```bash
npm run dev      # Start the development server
npm run build    # Type-check (tsc -b) and create a production build
npm run preview  # Serve the production build locally
```

## Deployment

- **Frontend** deploys to Vercel from `app/` (see `vercel.json` at the repo root). Set `VITE_MOMENTS_API_URL` to the deployed backend's URL.
- **Backend** deploys to any Node host (e.g. Railway) with Root Directory set to `backend/` — see `backend/railway.json`. Set the environment variables listed above.
- **On-chain program** is built and deployed separately with Anchor, upgraded in place with `solana program deploy` against the existing program ID for updates.

## Notes

- Everything runs on Solana **devnet**. Devnet SOL has no real-world value — the app is for entertainment and demonstration purposes only, not financial or gambling advice.
- Wallet actions require a Wallet Standard–compatible Solana wallet (e.g. Phantom) switched to Devnet.
