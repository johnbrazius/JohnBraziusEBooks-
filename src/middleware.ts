import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/session-token";

/**
 * First line of defence for /admin: reject requests without a valid signed session cookie.
 * Every admin page, action and API route ALSO calls requireAdmin(), which re-checks the database.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  const claims = secret ? await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value, secret) : null;
  if (!claims) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
