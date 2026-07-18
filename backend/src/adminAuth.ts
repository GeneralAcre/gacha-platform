/**
 * Minimal but real admin auth: the password is checked server-side against
 * ADMIN_PASSWORD (never shipped to the browser), and a session token is only ever
 * handed out after that check passes. This is deliberately not a client-side gate —
 * anything that only lived in the React bundle could be read by anyone who opened
 * devtools, so the check has to happen here.
 *
 * Tokens live in-memory (process-lifetime only, same scope as everything else in this
 * hackathon backend — see server.ts's recentMoments). A restart logs everyone out.
 */
import type { NextFunction, Request, Response } from "express";
import * as crypto from "crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const tokens = new Map<string, number>(); // token -> expiresAtMs

function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Pad to equal length first -- timingSafeEqual throws on a length mismatch, and
  // returning early on that check would itself leak length via timing.
  const len = Math.max(bufA.length, bufB.length, 1);
  const paddedA = Buffer.alloc(len);
  const paddedB = Buffer.alloc(len);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  return crypto.timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}

/** Checks `password` against ADMIN_PASSWORD and issues a fresh session token if it matches. */
export function login(password: string): string | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set on the server -- admin login is disabled until it is.");
  }
  if (!timingSafeEquals(password, expected)) return null;

  const token = crypto.randomBytes(32).toString("hex");
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

export function logout(token: string): void {
  tokens.delete(token);
}

function isValid(token: string): boolean {
  const expiresAt = tokens.get(token);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token || !isValid(token)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
