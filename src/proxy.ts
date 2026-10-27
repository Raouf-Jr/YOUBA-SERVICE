import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "youba_session";
const PUBLIC_PATHS = ["/", "/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser", "/hors-ligne"];

/**
 * Optimistic check only: bounces visitors without a session cookie to the login page.
 * Every page and Server Action still verifies the session against the database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL("/tableau-de-bord", request.url));
  }
  if (!PUBLIC_PATHS.includes(pathname) && !hasSession) {
    const url = new URL("/connexion", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|svg|jpg|ico|webp|txt|xml)$).*)"],
};
