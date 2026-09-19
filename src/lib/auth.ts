import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth configuration — Credentials provider with JWT sessions.
 *
 * Auto-create: the first time an email signs in with a password, an account
 * is created for it automatically (no separate registration flow).
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password || password.length < 6) return null;

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Auto-create the account on first sign-in
          const hashed = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email,
              password: hashed,
              name: email.split("@")[0],
              role: "AUTHOR",
            },
          });
        } else if (user.password) {
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;
        } else {
          // Account exists but has no password set — adopt this password
          const hashed = await bcrypt.hash(password, 10);
          user = await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist user.id + role into the JWT on sign-in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
