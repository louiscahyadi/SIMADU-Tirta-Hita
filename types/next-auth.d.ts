import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

// Strict application roles
type AppRole = "humas" | "distribusi";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    role: AppRole;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: AppRole;
  }
}
