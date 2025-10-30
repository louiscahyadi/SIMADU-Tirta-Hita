import Credentials from "next-auth/providers/credentials";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyPassword } from "@/lib/password";

import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

export type Role = "humas" | "distribusi";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "SIMADU Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<"username" | "password", string> | undefined) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) return null;

        // Account configurations with hashed passwords
        // Priority: Use PASSWORD_HASH if available, fallback to plain PASSWORD (dev only)
        const accounts: Array<{
          u: string;
          p?: string | undefined;
          ph?: string | undefined;
          id: string;
          name: string;
          role: Role;
        }> = [
          {
            u: env.HUMAS_USERNAME,
            p: env.HUMAS_PASSWORD,
            ph: env.HUMAS_PASSWORD_HASH,
            id: "humas",
            name: "Humas",
            role: "humas",
          },
          {
            u: env.DISTRIBUSI_USERNAME,
            p: env.DISTRIBUSI_PASSWORD,
            ph: env.DISTRIBUSI_PASSWORD_HASH,
            id: "distribusi",
            name: "Distribusi",
            role: "distribusi",
          },
        ];

        // Find matching username
        const account = accounts.find((a) => a.u === username);
        if (!account) return null;

        // Verify password: prefer hashed, fallback to plain (backward compat)
        let isValid = false;
        if (account.ph) {
          // Use bcrypt hash verification
          isValid = await verifyPassword(password, account.ph);
        } else if (account.p) {
          // Fallback: plain text comparison (DEPRECATED - only for dev)
          logger.warn(`Plain password used for ${username}. Please migrate to HASHED passwords!`, {
            username,
          });
          isValid = account.p === password;
        }

        if (isValid) {
          const user: User = {
            id: account.id,
            name: account.name,
            role: account.role,
          } as User;
          return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User | undefined }) {
      if (user && "role" in user) {
        token.role = (user as User).role as Role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user) {
        session.user.role = (token.role as Role) ?? session.user.role;
        session.user.id = (token.sub as string | undefined) ?? session.user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
};
