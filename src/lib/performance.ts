/**
 * Performance monitoring utilities for database queries and caching
 */

import { logger } from "./logger";

interface QueryMetrics {
  queryType: string;
  entityType: string;
  duration: number;
  timestamp: number;
  cached: boolean;
  resultCount?: number;
  filters?: Record<string, any>;
}

interface PerformanceStats {
  totalQueries: number;
  cachedQueries: number;
  avgQueryTime: number;
  slowQueries: QueryMetrics[];
  cacheHitRatio: number;
  queryTypeStats: Record<
    string,
    {
      count: number;
      avgDuration: number;
      cacheHitRatio: number;
    }
  >;
}

/**
 * Performance monitoring service
 */
class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 queries
  private readonly slowQueryThreshold = 1000; // 1 second

  /**
   * Record a database query execution
   */
  recordQuery(
    queryType: string,
    entityType: string,
    duration: number,
    cached: boolean = false,
    resultCount?: number,
    filters?: Record<string, any>,
  ): void {
    const metric: QueryMetrics = {
      queryType,
      entityType,
      duration,
      timestamp: Date.now(),
      cached,
      resultCount,
      filters,
    };

    this.metrics.push(metric);

    // Keep only the last N metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold && !cached) {
      logger.warn(`Slow query detected: ${queryType} on ${entityType} took ${duration}ms`, {
        queryType,
        entityType,
        duration,
        resultCount,
        filters,
      });
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindowMs: number = 300000): PerformanceStats {
    // Default 5 minutes
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        cachedQueries: 0,
        avgQueryTime: 0,
        slowQueries: [],
        cacheHitRatio: 0,
        queryTypeStats: {},
      };
    }

    const totalQueries = recentMetrics.length;
    const cachedQueries = recentMetrics.filter((m) => m.cached).length;
    const avgQueryTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const slowQueries = recentMetrics
      .filter((m) => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest

    const cacheHitRatio = totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0;

    // Query type statistics
    const queryTypeStats: Record<
      string,
      { count: number; avgDuration: number; cacheHitRatio: number }
    > = {};

    const groupedByType = recentMetrics.reduce(
      (acc, metric) => {
        const key = `${metric.queryType}:${metric.entityType}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(metric);
        return acc;
      },
      {} as Record<string, QueryMetrics[]>,
    );

    Object.entries(groupedByType).forEach(([key, metrics]) => {
      const count = metrics.length;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / count;
      const cached = metrics.filter((m) => m.cached).length;
      const hitRatio = count > 0 ? (cached / count) * 100 : 0;

      queryTypeStats[key] = {
        count,
        avgDuration: Math.round(avgDuration * 100) / 100,
        cacheHitRatio: Math.round(hitRatio * 100) / 100,
      };
    });

    return {
      totalQueries,
      cachedQueries,
      avgQueryTime: Math.round(avgQueryTime * 100) / 100,
      slowQueries,
      cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
      queryTypeStats,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get slow query report
   */
  getSlowQueryReport(limitMs: number = 500): QueryMetrics[] {
    return this.metrics
      .filter((m) => m.duration > limitMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20); // Top 20 slowest
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(timeWindowMs: number = 3600000): QueryMetrics[] {
    // Default 1 hour
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter((m) => m.timestamp > cutoff);
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order function to monitor database query performance
 */
export function withQueryMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryType: string,
  entityType: string,
  queryFn: T,
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    let resultCount: number | undefined;
    let cached = false;

    try {
      const result = await queryFn(...args);
      const duration = Date.now() - startTime;

      // Try to determine if this was a cached result
      // This is a heuristic - very fast queries might be cached
      cached = duration < 10;

      // Try to get result count
      if (Array.isArray(result)) {
        resultCount = result.length;
      } else if (result && typeof result === "object" && "items" in result) {
        resultCount = Array.isArray(result.items) ? result.items.length : undefined;
      }

      performanceMonitor.recordQuery(queryType, entityType, duration, cached, resultCount);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.recordQuery(queryType, entityType, duration, cached, 0);
      throw error;
    }
  }) as T;
}

/**
 * Decorator for monitoring Prisma queries
 */
export function monitorPrismaQuery<T extends Record<string, any>>(
  prismaClient: T,
  entityType: string,
): T {
  const monitored: Record<string, any> = {};

  Object.keys(prismaClient).forEach((key) => {
    const original = prismaClient[key];

    if (typeof original === "object" && original !== null) {
      monitored[key] = {};

      ["findMany", "findFirst", "findUnique", "count", "create", "update", "delete"].forEach(
        (method) => {
          if (typeof original[method] === "function") {
            monitored[key][method] = withQueryMonitoring(
              method,
              key,
              original[method].bind(original),
            );
          }
        },
      );

      // Copy other properties/methods
      Object.keys(original).forEach((prop) => {
        if (!monitored[key][prop]) {
          monitored[key][prop] = original[prop];
        }
      });
    } else {
      monitored[key] = original;
    }
  });

  return monitored as T;
}

/**
 * API endpoint for performance monitoring
 */
export async function getPerformanceReport(timeWindowMs?: number) {
  const stats = performanceMonitor.getStats(timeWindowMs);
  const slowQueries = performanceMonitor.getSlowQueryReport();

  return {
    stats,
    slowQueries,
    recommendations: generatePerformanceRecommendations(stats, slowQueries),
  };
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(
  stats: PerformanceStats,
  slowQueries: QueryMetrics[],
): string[] {
  const recommendations: string[] = [];

  // Cache hit ratio recommendations
  if (stats.cacheHitRatio < 50) {
    recommendations.push(
      `Low cache hit ratio (${stats.cacheHitRatio}%). Consider increasing cache TTL or identifying frequently accessed data for caching.`,
    );
  }

  // Slow query recommendations
  if (slowQueries.length > 0) {
    const slowestQuery = slowQueries[0];
    recommendations.push(
      `Slow queries detected. Slowest: ${slowestQuery.queryType} on ${slowestQuery.entityType} (${slowestQuery.duration}ms). Consider adding database indexes or optimizing query.`,
    );
  }

  // Query volume recommendations
  const highVolumeTypes = Object.entries(stats.queryTypeStats)
    .filter(([, data]) => data.count > 50)
    .sort((a, b) => b[1].count - a[1].count);

  if (highVolumeTypes.length > 0) {
    const [type, data] = highVolumeTypes[0];
    recommendations.push(
      `High query volume for ${type} (${data.count} queries). Consider implementing more aggressive caching or pagination.`,
    );
  }

  // Average query time recommendations
  if (stats.avgQueryTime > 200) {
    recommendations.push(
      `Average query time is high (${stats.avgQueryTime}ms). Consider database optimization, indexing, or query restructuring.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Performance looks good! No immediate optimizations needed.");
  }

  return recommendations;
}

/**
 * Utility to log performance summary
 */
export function logPerformanceSummary(timeWindowMs: number = 300000): void {
  const stats = performanceMonitor.getStats(timeWindowMs);

  logger.info("Performance Summary", {
    totalQueries: stats.totalQueries,
    cacheHitRatio: `${stats.cacheHitRatio}%`,
    avgQueryTime: `${stats.avgQueryTime}ms`,
    slowQueriesCount: stats.slowQueries.length,
    topQueryTypes: Object.entries(stats.queryTypeStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([type, data]) => ({ type, count: data.count, avgDuration: data.avgDuration })),
  });
}

/**
 * Schedule periodic performance logging
 */
export function startPerformanceLogging(intervalMs: number = 300000): NodeJS.Timeout {
  return setInterval(() => {
    logPerformanceSummary();
  }, intervalMs);
}

/**
 * Export types for external use
 */
export type { QueryMetrics, PerformanceStats };
