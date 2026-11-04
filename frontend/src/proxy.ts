
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles authentication redirects and home-page navigation.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public pages.
  const publicRoutes = ["/login", "/signup"];

  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Check for the session cookie.
  const sessionToken = request.cookies.get("session")?.value;

  // Redirect users without a cookie to login.
  if (!sessionToken) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Redirect the root page to the dashboard.
  if (path === "/") {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
