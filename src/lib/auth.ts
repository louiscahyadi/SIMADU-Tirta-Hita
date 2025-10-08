import Credentials from "next-auth/providers/credentials";

import { env } from "@/lib/env";

import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<"username" | "password", string> | undefined) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) return null;

        // Map of allowed credential pairs and roles
        const accounts: Array<{ u: string; p: string; id: string; name: string; role: string }> = [
          {
            u: env.ADMIN_USERNAME,
            p: env.ADMIN_PASSWORD,
            id: "admin",
            name: "Administrator",
            role: "admin",
          },
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
        if (match) return { id: match.id, name: match.name, role: match.role } as any;
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        (token as any).role = (user as any).role || "user";
      }
      return token;
    },
    async session({ session, token }: any) {
      (session as any).user = {
        ...(session.user || {}),
        role: (token as any).role || "user",
        id: (token as any).sub,
      } as any;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
};
