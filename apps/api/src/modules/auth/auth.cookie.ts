import { CookieOptions, Response } from "express";

export const ACCESS_COOKIE = "atp_token";
export const REFRESH_COOKIE = "atp_refresh";
export const SESSION_HINT_COOKIE = "atp_session";
export const REFRESH_COOKIE_PATH = "/api/auth";

export interface CookieSettings {
  secure: boolean;
  accessTtlSeconds: number;
}

function base(secure: boolean): CookieOptions {
  return { httpOnly: true, secure };
}

export function setAuthCookies(
  response: Response,
  settings: CookieSettings,
  tokens: { accessToken: string; refreshToken: string; refreshExpiresAt: Date },
) {
  const refreshMaxAge = Math.max(0, tokens.refreshExpiresAt.getTime() - Date.now());
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(settings.secure),
    sameSite: "lax",
    path: "/",
    maxAge: settings.accessTtlSeconds * 1000,
  });
  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(settings.secure),
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshMaxAge,
  });
  response.cookie(SESSION_HINT_COOKIE, "1", {
    ...base(settings.secure),
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(response: Response, secure: boolean) {
  response.clearCookie(ACCESS_COOKIE, { ...base(secure), sameSite: "lax", path: "/" });
  response.clearCookie(REFRESH_COOKIE, { ...base(secure), sameSite: "strict", path: REFRESH_COOKIE_PATH });
  response.clearCookie(SESSION_HINT_COOKIE, { ...base(secure), sameSite: "lax", path: "/" });
}
