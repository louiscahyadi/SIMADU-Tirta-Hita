import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { cacheMetrics } from "@/lib/cache";
import { env } from "@/lib/env";
import { AppError, errorResponse, handleApiError } from "@/lib/errors";
import { getPerformanceReport } from "@/lib/performance";

/**
 * Performance monitoring API endpoint
 * GET /api/performance - Get performance statistics and cache metrics
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    const role = token?.role;

    // Only allow distribusi role to access performance data (admin-like privileges)
    if (role !== "distribusi") {
      return errorResponse(AppError.forbidden(role ?? null, ["distribusi"]));
    }

    const { searchParams } = new URL(req.url);
    const timeWindowMs = parseInt(searchParams.get("timeWindow") || "300000", 10); // Default 5 minutes

    // Get query performance metrics
    const performanceReport = await getPerformanceReport(timeWindowMs);

    // Get cache metrics
    const cacheStats = cacheMetrics.getMetrics();

    return NextResponse.json({
      performance: performanceReport,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
      timeWindowMs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Clear performance metrics
 * DELETE /api/performance - Clear all performance metrics (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    // Require admin authentication
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    const role = token?.role;

    if (role !== "distribusi") {
      return errorResponse(AppError.forbidden(role ?? null, ["distribusi"]));
    }

    // Clear cache metrics
    cacheMetrics.reset();

    return NextResponse.json({
      message: "Performance metrics cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
