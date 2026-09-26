import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const OBJECT_ID = /^[a-f0-9]{24}$/;
const SECRET = /^[A-Za-z0-9_-]{43}$/;

export function newRefreshSecret() {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function formatRefreshToken(sessionId: string, secret: string) {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(value: unknown): { sessionId: string; secret: string } | null {
  if (typeof value !== "string" || value.length > 100) return null;
  const [sessionId, secret, extra] = value.split(".");
  if (extra !== undefined || !sessionId || !secret || !OBJECT_ID.test(sessionId) || !SECRET.test(secret)) return null;
  return { sessionId, secret };
}

export function sameHash(left: string | undefined, right: string | undefined) {
  if (!left || !right || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
