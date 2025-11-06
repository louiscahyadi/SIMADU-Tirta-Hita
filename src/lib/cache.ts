/**
 * Caching utilities for performance optimization
 * Provides in-memory caching with TTL and Redis-like interface
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
  tags?: string[];
}

/**
 * In-memory cache with TTL support
 */
class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private timers = new Map<string, NodeJS.Timeout>();

  set<T>(key: string, value: T, ttlSeconds: number = 300, tags?: string[]): void {
    // Clear existing timer if any
    this.clearTimer(key);

    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry, tags });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): boolean {
    this.clearTimer(key);
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Invalidate all cached entries with specific tags
   */
  invalidateByTags(tags: string[]): number {
    let deleted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some((tag) => tags.includes(tag))) {
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiry) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      timers: this.timers.size,
    };
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

/**
 * Global cache instance
 */
const globalCache = new InMemoryCache();

/**
 * Cache key builders for different entity types
 */
export const CacheKeys = {
  complaint: {
    list: (filters: Record<string, any>) => `complaints:list:${JSON.stringify(filters)}`,
    detail: (id: string) => `complaint:${id}`,
    count: (filters: Record<string, any>) => `complaints:count:${JSON.stringify(filters)}`,
    status: (status: string, dateRange?: any) =>
      `complaints:status:${status}:${JSON.stringify(dateRange)}`,
  },
  serviceRequest: {
    list: (filters: Record<string, any>) => `service-requests:list:${JSON.stringify(filters)}`,
    detail: (id: string) => `service-request:${id}`,
    count: (filters: Record<string, any>) => `service-requests:count:${JSON.stringify(filters)}`,
  },
  workOrder: {
    list: (filters: Record<string, any>) => `work-orders:list:${JSON.stringify(filters)}`,
    detail: (id: string) => `work-order:${id}`,
    count: (filters: Record<string, any>) => `work-orders:count:${JSON.stringify(filters)}`,
  },
  repairReport: {
    list: (filters: Record<string, any>) => `repair-reports:list:${JSON.stringify(filters)}`,
    detail: (id: string) => `repair-report:${id}`,
    count: (filters: Record<string, any>) => `repair-reports:count:${JSON.stringify(filters)}`,
  },
  dashboard: {
    kpis: (dateRange?: any) => `dashboard:kpis:${JSON.stringify(dateRange)}`,
    stats: (scope: string, dateRange?: any) =>
      `dashboard:stats:${scope}:${JSON.stringify(dateRange)}`,
  },
};

/**
 * Cache tags for invalidation
 */
export const CacheTags = {
  COMPLAINTS: "complaints",
  SERVICE_REQUESTS: "service-requests",
  WORK_ORDERS: "work-orders",
  REPAIR_REPORTS: "repair-reports",
  DASHBOARD: "dashboard",
  STATISTICS: "statistics",
};

/**
 * Cache helper functions
 */
export const Cache = {
  /**
   * Get cached value
   */
  get: <T>(key: string): T | null => globalCache.get<T>(key),

  /**
   * Set cached value with TTL
   */
  set: <T>(key: string, value: T, ttlSeconds: number = 300, tags?: string[]): void => {
    globalCache.set(key, value, ttlSeconds, tags);
  },

  /**
   * Delete cached value
   */
  delete: (key: string): boolean => globalCache.delete(key),

  /**
   * Check if key exists in cache
   */
  has: (key: string): boolean => globalCache.has(key),

  /**
   * Clear all cache
   */
  clear: (): void => globalCache.clear(),

  /**
   * Invalidate cache by tags
   */
  invalidateByTags: (tags: string[]): number => globalCache.invalidateByTags(tags),

  /**
   * Get cache statistics
   */
  getStats: () => globalCache.getStats(),

  /**
   * Cache wrapper for async functions
   */
  remember: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300,
    tags?: string[],
  ): Promise<T> => {
    // Try to get from cache first
    const cached = globalCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetcher();

    // Store in cache
    globalCache.set(key, fresh, ttlSeconds, tags);

    return fresh;
  },

  /**
   * Cache wrapper for paginated results
   */
  rememberPaginated: async <T>(
    key: string,
    fetcher: () => Promise<{ items: T[]; total: number }>,
    ttlSeconds: number = 300,
    tags?: string[],
  ): Promise<{ items: T[]; total: number }> => {
    return Cache.remember(key, fetcher, ttlSeconds, tags);
  },
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate all complaint-related caches
   */
  complaints: () => {
    Cache.invalidateByTags([CacheTags.COMPLAINTS, CacheTags.DASHBOARD, CacheTags.STATISTICS]);
  },

  /**
   * Invalidate all service request-related caches
   */
  serviceRequests: () => {
    Cache.invalidateByTags([CacheTags.SERVICE_REQUESTS, CacheTags.DASHBOARD, CacheTags.STATISTICS]);
  },

  /**
   * Invalidate all work order-related caches
   */
  workOrders: () => {
    Cache.invalidateByTags([CacheTags.WORK_ORDERS, CacheTags.DASHBOARD, CacheTags.STATISTICS]);
  },

  /**
   * Invalidate all repair report-related caches
   */
  repairReports: () => {
    Cache.invalidateByTags([CacheTags.REPAIR_REPORTS, CacheTags.DASHBOARD, CacheTags.STATISTICS]);
  },

  /**
   * Invalidate dashboard caches
   */
  dashboard: () => {
    Cache.invalidateByTags([CacheTags.DASHBOARD, CacheTags.STATISTICS]);
  },

  /**
   * Invalidate all caches (use sparingly)
   */
  all: () => {
    Cache.clear();
  },
};

/**
 * Middleware for automatic cache invalidation
 */
export function withCacheInvalidation<T extends (...args: any[]) => any>(
  fn: T,
  invalidationFn: () => void,
): T {
  return ((...args: Parameters<T>) => {
    const result = fn(...args);

    // If it's a Promise, invalidate after resolution
    if (result instanceof Promise) {
      return result.then((value) => {
        invalidationFn();
        return value;
      });
    }

    // Synchronous function
    invalidationFn();
    return result;
  }) as T;
}

/**
 * Cache configuration
 */
export const CacheConfig = {
  // Default TTL values in seconds
  DEFAULT_TTL: 300, // 5 minutes
  DASHBOARD_TTL: 60, // 1 minute for dashboards
  LIST_TTL: 180, // 3 minutes for lists
  DETAIL_TTL: 600, // 10 minutes for details
  COUNT_TTL: 120, // 2 minutes for counts
  STATISTICS_TTL: 300, // 5 minutes for statistics
};

/**
 * Performance monitoring for cache hit/miss ratios
 */
class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private startTime = Date.now();

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getMetrics() {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? (this.hits / total) * 100 : 0;
    const uptime = Date.now() - this.startTime;

    return {
      hits: this.hits,
      misses: this.misses,
      total,
      hitRatio: Math.round(hitRatio * 100) / 100,
      uptimeMs: uptime,
      cacheStats: globalCache.getStats(),
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.startTime = Date.now();
  }
}

export const cacheMetrics = new CacheMetrics();

/**
 * Enhanced cache remember function with metrics
 */
export async function rememberWithMetrics<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CacheConfig.DEFAULT_TTL,
  tags?: string[],
): Promise<T> {
  const cached = Cache.get<T>(key);

  if (cached !== null) {
    cacheMetrics.recordHit();
    return cached;
  }

  cacheMetrics.recordMiss();
  const fresh = await fetcher();
  Cache.set(key, fresh, ttlSeconds, tags);

  return fresh;
}
