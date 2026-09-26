import { ApiFailure } from "@atp/shared-types";
import { SESSION_EXPIRED, isPublicPage, loginUrl } from "./redirect";

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Session cookies are only sent same-site, and localhost and 127.0.0.1 are different sites,
// so a loopback API has to be called on the same hostname the page was opened with.
export function apiUrl() {
  if (typeof window === "undefined") return CONFIGURED_API_URL;
  const url = new URL(CONFIGURED_API_URL);
  if (LOOPBACK_HOSTS.has(url.hostname) && LOOPBACK_HOSTS.has(window.location.hostname)) {
    url.hostname = window.location.hostname;
  }
  return url.toString().replace(/\/$/, "");
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof ApiClientError ? error.message : "Something went wrong. Check that the API is running.";
}

const SESSION_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

let refreshing: Promise<boolean> | null = null;
let redirecting = false;

function refreshSession() {
  refreshing ??= fetch(`${apiUrl()}/auth/refresh`, { method: "POST", credentials: "include" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function sendToLogin(): Promise<boolean> {
  if (typeof window === "undefined" || isPublicPage(window.location.pathname)) return false;
  if (!redirecting) {
    redirecting = true;
    await fetch(`${apiUrl()}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.location.replace(loginUrl(`${window.location.pathname}${window.location.search}`, SESSION_EXPIRED));
  }
  return true;
}

async function send(path: string, init: RequestInit | undefined, headers: Headers) {
  try {
    return await fetch(`${apiUrl()}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiClientError("The API is not reachable", "CONFIGURATION_ERROR");
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await send(path, init, headers);
  if (response.status === 401 && !SESSION_PATHS.includes(path)) {
    if (await refreshSession()) {
      response = await send(path, init, headers);
    }
    if (response.status === 401 && (await sendToLogin())) {
      return new Promise<T>(() => undefined);
    }
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as { success: boolean; data?: T; error?: ApiFailure["error"] }) : null;

  if (!response.ok || !body?.success) {
    throw new ApiClientError(body?.error?.message ?? "Request failed", body?.error?.code ?? "INTERNAL_ERROR", body?.error?.details ?? []);
  }

  return body.data as T;
}
