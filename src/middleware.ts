import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";

import type { NextRequest } from "next/server";

// NextAuth-based protection for internal pages.
export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const isApi = pathname.startsWith("/api/");

  // Simple in-memory rate limiter (best-effort). For production, prefer Redis or edge KV.
  const RATE_LIMIT = 60; // requests
  const WINDOW_MS = 60_000; // 1 minute
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    // @ts-ignore - NextRequest may expose ip in some runtimes
    (req as any).ip ||
    "unknown";

  const now = Date.now();
  // @ts-ignore - attach a global store for dev/server runtime
  const store = ((globalThis as any).__RL_STORE__ ||= new Map<string, number[]>());
  if (isApi) {
    const key = `${ip}`;
    const arr: number[] = store.get(key) || [];
    const recent = arr.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    store.set(key, recent);
    if (recent.length > RATE_LIMIT) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      });
    }
  }

  // Public pages
  const publicPaths = ["/", "/pengaduan", "/login", "/api/auth"];
  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    (pathname.startsWith("/api/complaints") && req.method === "POST");
  if (isPublic) {
    const resp = NextResponse.next();
    return applySecurityHeaders(req, resp, isApi);
  }

  // Protect other routes: require a valid NextAuth token with allowed roles
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;

  // Role-based route-level guard (coarse):
  // - HUMAS: can access service-requests creation UI/api and complaints listing
  // - DISTRIBUSI: can access work-orders & repair-reports UI/api
  // - ADMIN: full access
  if (role) {
    if (role === "admin") {
      const resp = NextResponse.next();
      return applySecurityHeaders(req, resp, isApi);
    }
    const p = pathname;
    const allowHumas =
      role === "humas" &&
      (p.startsWith("/daftar-data") ||
        p.startsWith("/ringkasan") ||
        p === "/" ||
        p.startsWith("/_next") ||
        p.startsWith("/api/service-requests") ||
        p.startsWith("/api/complaints"));
    const allowDistribusi =
      role === "distribusi" &&
      (p.startsWith("/daftar-data") ||
        p.startsWith("/ringkasan") ||
        p === "/" ||
        p.startsWith("/_next") ||
        p.startsWith("/api/work-orders") ||
        p.startsWith("/api/repair-reports") ||
        p.startsWith("/api/complaints"));
    if (allowHumas || allowDistribusi) {
      const resp = NextResponse.next();
      return applySecurityHeaders(req, resp, isApi);
    }
  }

  // If not authenticated, redirect to /login
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", url.pathname + url.search);
  const redirect = NextResponse.redirect(loginUrl);
  return applySecurityHeaders(req, redirect, isApi);
}

export const config = {
  matcher: ["/(.*)"],
};

function applySecurityHeaders(req: NextRequest, res: NextResponse, isApi: boolean) {
  // Common headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  // Only set a conservative CSP on API to avoid breaking pages during dev
  if (isApi) {
    res.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
  }
  // HSTS only when HTTPS
  if (req.nextUrl.protocol === "https:") {
    res.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  return res;
}
