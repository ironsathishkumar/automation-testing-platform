import { ApiFailure } from "@atp/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api";

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
const PUBLIC_PAGES = ["/login", "/register"];

let refreshing: Promise<boolean> | null = null;

function refreshSession() {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function sendToLogin() {
  if (typeof window === "undefined") return;
  if (PUBLIC_PAGES.some((page) => window.location.pathname.startsWith(page))) return;
  window.location.assign("/login");
}

async function send(path: string, init: RequestInit | undefined, headers: Headers) {
  try {
    return await fetch(`${API_URL}${path}`, {
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
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await send(path, init, headers);
  if (response.status === 401 && !SESSION_PATHS.includes(path)) {
    if (await refreshSession()) {
      response = await send(path, init, headers);
    }
    if (response.status === 401) sendToLogin();
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as { success: boolean; data?: T; error?: ApiFailure["error"] }) : null;

  if (!response.ok || !body?.success) {
    throw new ApiClientError(body?.error?.message ?? "Request failed", body?.error?.code ?? "INTERNAL_ERROR", body?.error?.details ?? []);
  }

  return body.data as T;
}
