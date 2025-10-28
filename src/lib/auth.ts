import Credentials from "next-auth/providers/credentials";

import { env } from "@/lib/env";

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

        // Map of allowed credential pairs and roles
        const accounts: Array<{ u: string; p: string; id: string; name: string; role: Role }> = [
          {
            u: env.HUMAS_USERNAME,
            p: env.HUMAS_PASSWORD,
            id: "humas",
            name: "Humas",
            role: "humas",
          },
          {
            u: env.DISTRIBUSI_USERNAME,
            p: env.DISTRIBUSI_PASSWORD,
            id: "distribusi",
            name: "Distribusi",
            role: "distribusi",
          },
        ];

        const match = accounts.find((a) => a.u === username && a.p === password);
        if (match) {
          const user: User = { id: match.id, name: match.name, role: match.role } as User;
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
