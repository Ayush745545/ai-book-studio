import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();
  // Next's dev server can normalize 127.0.0.1 to localhost internally. Keep
  // the browser's actual host so its account cookies and callback stay together.
  const origin = new URL(req.url);
  const host = req.headers.get("host");
  if (host) origin.host = host;
  const login = new URL("/login", origin);
  login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}
export const config = { matcher: ["/dashboard/:path*", "/books/:path*"] };
