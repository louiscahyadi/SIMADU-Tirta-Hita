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

  // Special rate limit for public complaint endpoint
  const PUBLIC_COMPLAINT_LIMIT = 10; // requests
  const PUBLIC_COMPLAINT_WINDOW_MS = 300_000; // 5 minutes

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    // @ts-ignore - NextRequest may expose ip in some runtimes
    (req as any).ip ||
    "unknown";

  const now = Date.now();
  // @ts-ignore - attach a global store for dev/server runtime
  const store = ((globalThis as any).__RL_STORE__ ||= new Map<string, number[]>());

  // Special rate limiting for public complaint submissions
  if (pathname === "/api/complaints" && req.method === "POST") {
    const publicKey = `public_complaint_${ip}`;
    const arr: number[] = store.get(publicKey) || [];
    const recent = arr.filter((t) => now - t < PUBLIC_COMPLAINT_WINDOW_MS);
    recent.push(now);
    store.set(publicKey, recent);
    if (recent.length > PUBLIC_COMPLAINT_LIMIT) {
      return new NextResponse("Terlalu banyak pengaduan. Silakan coba lagi dalam 5 menit.", {
        status: 429,
        headers: {
          "Retry-After": "300",
        },
      });
    }
  }

  // General API rate limiting
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

  // Public pages (internal app: keep minimal)
  // Allow public complaint page and POST to complaints API
  const publicPaths = [
    "/",
    "/login",
    "/login/humas",
    "/login/distribusi",
    "/pengaduan",
    "/api/auth",
  ];
  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    // Allow POST to /api/complaints for public submissions
    (pathname === "/api/complaints" && req.method === "POST") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets");
  if (isPublic) {
    const resp = NextResponse.next();
    return applySecurityHeaders(req, resp, isApi);
  }

  // Protect other routes: require a valid NextAuth token with allowed roles
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;

  // Role-based route-level guard (coarse):
  // - HUMAS: can access Daftar Data (list & details) + HUMAS pages + related APIs
  // - DISTRIBUSI: cannot access Daftar Data listing; may access only detail pages under
  //   /daftar-data/(service|workorder|repair)/[id] for viewing/printing, plus Distribusi pages/APIs
  if (role) {
    // If already logged in and trying to access generic /login, route to role dashboard
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const to = role === "humas" ? "/humas" : role === "distribusi" ? "/distribusi" : "/";
      const redirect = NextResponse.redirect(new URL(to, req.url));
      return applySecurityHeaders(req, redirect, isApi);
    }
    const p = pathname;
    const allowHumas =
      role === "humas" &&
      (p.startsWith("/humas") ||
        p.startsWith("/daftar-data") ||
        p === "/" ||
        p.startsWith("/_next") ||
        p.startsWith("/api/service-requests") ||
        p.startsWith("/api/complaints"));
    const allowDistribusi =
      role === "distribusi" &&
      (p.startsWith("/distribusi") ||
        // Allow viewing detail pages only (not the Daftar Data listing)
        p.startsWith("/daftar-data/service/") ||
        p.startsWith("/daftar-data/workorder/") ||
        p.startsWith("/daftar-data/repair/") ||
        p === "/" ||
        p.startsWith("/_next") ||
        p.startsWith("/api/work-orders") ||
        p.startsWith("/api/repair-reports") ||
        p.startsWith("/api/complaints"));
    if (allowHumas || allowDistribusi) {
      const resp = NextResponse.next();
      return applySecurityHeaders(req, resp, isApi);
    }
    // Authenticated but accessing a disallowed route -> send to the proper dashboard
    const to = role === "humas" ? "/humas" : role === "distribusi" ? "/distribusi" : "/";
    const redirectHome = NextResponse.redirect(new URL(to, req.url));
    return applySecurityHeaders(req, redirectHome, isApi);
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
