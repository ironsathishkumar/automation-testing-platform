import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_EXPIRED, isPublicPage, loginUrl, safeNext } from "@/lib/redirect";

export function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const isPublic = isPublicPage(pathname);

  if (isPublic && searchParams.get("reason") === SESSION_EXPIRED) {
    const response = NextResponse.next();
    response.cookies.set("atp_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("atp_session", "", { path: "/", maxAge: 0 });
    return response;
  }

  const signedIn = request.cookies.has("atp_token") || request.cookies.has("atp_session");

  if (!signedIn && !isPublic) {
    return NextResponse.redirect(new URL(loginUrl(`${pathname}${search}`), request.url));
  }

  if (signedIn && isPublic) {
    return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
