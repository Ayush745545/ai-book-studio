import { withAuth } from "next-auth/middleware";

/**
 * Protects the app routes — unauthenticated visitors are redirected to /login
 * with a callbackUrl so they land back where they were going after sign-in.
 */
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/books/:path*"],
};
