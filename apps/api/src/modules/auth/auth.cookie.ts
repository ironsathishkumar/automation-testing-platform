import { CookieOptions } from "express";

export const TOKEN_COOKIE = "atp_token";

export function cookieOptions(expiresIn: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: expiresInToMs(expiresIn),
  };
}

function expiresInToMs(value: string) {
  const match = /^(\d+)([dhms])$/.exec(value);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit ?? "d"] ?? 86_400_000);
}
