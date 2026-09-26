export const PUBLIC_PAGES = ["/login", "/register"];
export const SESSION_EXPIRED = "expired";

export function isPublicPage(pathname: string) {
  return PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  const pathname = value.split(/[?#]/)[0] ?? "";
  return isPublicPage(pathname) ? "/dashboard" : value;
}

export function loginUrl(next: string, reason?: string) {
  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);
  const target = safeNext(next);
  if (target !== "/dashboard") params.set("next", target);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
