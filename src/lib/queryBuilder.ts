/**
 * Utility functions for building reusable Prisma query conditions
 * Mengatasi code duplication untuk query patterns yang berulang
 */

type DateRangeFilter = {
  gte?: Date;
  lte?: Date;
};

type SearchField = {
  field: string;
  searchTerm: string;
  mode?: "insensitive" | "default";
};

/**
 * Builds date range filter for createdAt field
 */
export function buildDateRangeFilter(from?: Date, to?: Date): { createdAt: DateRangeFilter } | {} {
  if (!from && !to) return {};

  let toEnd: Date | undefined = to;
  if (to) {
    toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
  }

  const dateRange: DateRangeFilter = {};
  if (from) dateRange.gte = from;
  if (toEnd) dateRange.lte = toEnd;

  return { createdAt: dateRange };
}

/**
 * Builds search filter with OR conditions across multiple fields
 */
export function buildSearchFilter(
  searchTerm: string | undefined,
  fields: string[],
): { OR: any[] } | {} {
  if (!searchTerm || !searchTerm.trim() || fields.length === 0) return {};

  const searchConditions = fields.map((field) => ({
    [field]: { contains: searchTerm.trim(), mode: "insensitive" },
  }));

  return { OR: searchConditions };
}

/**
 * Builds combined where clause with common patterns
 */
export function buildWhereClause({
  dateRange,
  searchTerm,
  searchFields = [],
  additionalConditions = {},
}: {
  dateRange?: { from?: Date; to?: Date };
  searchTerm?: string;
  searchFields?: string[];
  additionalConditions?: Record<string, any>;
}): Record<string, any> {
  return {
    ...buildDateRangeFilter(dateRange?.from, dateRange?.to),
    ...buildSearchFilter(searchTerm, searchFields),
    ...additionalConditions,
  };
}

/**
 * Builds orderBy clause with validation
 */
export function buildOrderBy(
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
  allowedFields: string[] = ["createdAt"],
): Record<string, "asc" | "desc"> {
  const field = allowedFields.includes(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}

/**
 * Utility class for common query patterns
 */
export class QueryBuilder {
  private whereConditions: Record<string, any> = {};

  constructor() {}

  /**
   * Add date range filter
   */
  withDateRange(from?: Date, to?: Date): this {
    Object.assign(this.whereConditions, buildDateRangeFilter(from, to));
    return this;
  }

  /**
   * Add search filter
   */
  withSearch(searchTerm: string | undefined, fields: string[]): this {
    Object.assign(this.whereConditions, buildSearchFilter(searchTerm, fields));
    return this;
  }

  /**
   * Add custom conditions
   */
  withConditions(conditions: Record<string, any>): this {
    Object.assign(this.whereConditions, conditions);
    return this;
  }

  /**
   * Get the built where clause
   */
  build(): Record<string, any> {
    return { ...this.whereConditions };
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.whereConditions = {};
    return this;
  }
}

/**
 * Predefined search field mappings for common entities
 */
export const SEARCH_FIELDS = {
  complaint: ["customerName", "address", "connectionNumber", "phone", "complaintText", "category"],
  serviceRequest: [
    "customerName",
    "address",
    "serviceNumber",
    "phone",
    "receivedBy",
    "handlerName",
    "inspectorName",
    "actionTaken",
    "serviceCostBy",
    "handoverReceiver",
    "handoverCustomer",
  ],
  workOrder: [
    "number",
    "reporterName",
    "handlingTime",
    "disturbanceLocation",
    "disturbanceType",
    "city",
    "executorName",
    "team",
  ],
  repairReport: ["city", "executorName", "team", "authorizedBy", "otherActions", "otherNotHandled"],
};

/**
 * Predefined allowed sort fields for common entities
 */
export const SORT_FIELDS = {
  complaint: ["createdAt", "customerName", "category"],
  serviceRequest: ["createdAt", "customerName", "address", "serviceNumber", "handlerName"],
  workOrder: [
    "createdAt",
    "number",
    "reporterName",
    "disturbanceLocation",
    "disturbanceType",
    "team",
  ],
  repairReport: ["createdAt", "city", "team", "authorizedBy"],
};

/**
 * Helper function for common complaint status filters
 */
export function buildComplaintStatusFilter(status?: string): Record<string, any> {
  if (!status) return {};

  switch (status) {
    case "baru":
      return {
        AND: [
          { processedAt: null },
          { serviceRequestId: null },
          { workOrderId: null },
          { repairReportId: null },
        ],
      };
    case "processed":
    case "proses":
      return {
        OR: [
          { processedAt: { not: null } },
          { serviceRequestId: { not: null } },
          { workOrderId: { not: null } },
          { repairReportId: { not: null } },
        ],
      };
    case "selesai":
      return { repairReportId: { not: null } };
    default:
      return {};
  }
}

/**
 * Helper functions for pagination
 */
export function buildPaginationOptions(page: number = 1, pageSize: number = 10) {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.min(Math.max(1, pageSize), 100); // Max 100 items per page

  return {
    skip: (normalizedPage - 1) * normalizedPageSize,
    take: normalizedPageSize,
  };
}

/**
 * Parse and validate pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 10,
  };
}

/**
 * Parse date parameters from URL search params
 */
export function parseDateParams(searchParams: URLSearchParams) {
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;

  // Validate dates
  const fromDate = from && !isNaN(from.getTime()) ? from : undefined;
  const toDate = to && !isNaN(to.getTime()) ? to : undefined;

  return { from: fromDate, to: toDate };
}

/**
 * Performance-optimized includes for common entity queries
 */
export const OPTIMIZED_INCLUDES = {
  complaint: {
    // Basic include for list views
    basic: {
      serviceRequest: {
        select: { id: true, reporterName: true, urgency: true, requestDate: true },
      },
      workOrder: {
        select: { id: true, number: true, team: true, scheduledDate: true },
      },
      repairReport: {
        select: { id: true, result: true, startTime: true, endTime: true },
      },
    },
    // Full include for detail views
    detailed: {
      serviceRequest: {
        select: {
          id: true,
          reporterName: true,
          urgency: true,
          requestDate: true,
          description: true,
          notes: true,
        },
      },
      workOrder: {
        select: {
          id: true,
          number: true,
          team: true,
          scheduledDate: true,
          technicians: true,
          instructions: true,
        },
      },
      repairReport: {
        select: {
          id: true,
          result: true,
          startTime: true,
          endTime: true,
          actionTaken: true,
          remarks: true,
          customerConfirmationName: true,
        },
      },
      histories: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          note: true,
          actorRole: true,
        },
        orderBy: { createdAt: "desc" as const },
        take: 10, // Limit history records for performance
      },
    },
  },
  serviceRequest: {
    basic: {
      workOrder: {
        select: {
          id: true,
          number: true,
          team: true,
          scheduledDate: true,
          repairReport: {
            select: { id: true, result: true },
          },
        },
      },
      complaint: {
        select: { id: true, customerName: true, category: true },
      },
    },
  },
  workOrder: {
    basic: {
      serviceRequest: {
        select: { id: true, reporterName: true, urgency: true },
      },
      repairReport: {
        select: { id: true, result: true, startTime: true, endTime: true },
      },
      complaint: {
        select: { id: true, customerName: true, category: true },
      },
    },
  },
  repairReport: {
    basic: {
      workOrder: {
        select: {
          id: true,
          number: true,
          team: true,
          serviceRequest: {
            select: { id: true, reporterName: true },
          },
          complaint: {
            select: { id: true, customerName: true },
          },
        },
      },
      complaint: {
        select: { id: true, customerName: true, category: true },
      },
    },
  },
};

/**
 * Build optimized complaint query with selective includes
 */
export function buildComplaintQuery(
  filters: {
    dateRange?: { from?: Date; to?: Date };
    searchTerm?: string;
    status?: string;
    additionalConditions?: Record<string, any>;
  },
  options: {
    includeLevel?: "basic" | "detailed";
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const {
    includeLevel = "basic",
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const where = buildWhereClause({
    dateRange: filters.dateRange,
    searchTerm: filters.searchTerm,
    searchFields: SEARCH_FIELDS.complaint,
    additionalConditions: {
      ...buildComplaintStatusFilter(filters.status),
      ...filters.additionalConditions,
    },
  });

  const include = OPTIMIZED_INCLUDES.complaint[includeLevel];
  const orderBy = buildOrderBy(sortBy, sortOrder, SORT_FIELDS.complaint);
  const pagination = buildPaginationOptions(page, pageSize);

  return {
    where,
    include,
    orderBy,
    ...pagination,
  };
}

/**
 * Build optimized service request query
 */
export function buildServiceRequestQuery(
  filters: {
    dateRange?: { from?: Date; to?: Date };
    searchTerm?: string;
    additionalConditions?: Record<string, any>;
  },
  options: {
    includeLevel?: "basic";
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const {
    includeLevel = "basic",
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const where = buildWhereClause({
    dateRange: filters.dateRange,
    searchTerm: filters.searchTerm,
    searchFields: SEARCH_FIELDS.serviceRequest,
    additionalConditions: filters.additionalConditions,
  });

  const include = OPTIMIZED_INCLUDES.serviceRequest[includeLevel];
  const orderBy = buildOrderBy(sortBy, sortOrder, SORT_FIELDS.serviceRequest);
  const pagination = buildPaginationOptions(page, pageSize);

  return {
    where,
    include,
    orderBy,
    ...pagination,
  };
}

/**
 * Build optimized work order query
 */
export function buildWorkOrderQuery(
  filters: {
    dateRange?: { from?: Date; to?: Date };
    searchTerm?: string;
    additionalConditions?: Record<string, any>;
  },
  options: {
    includeLevel?: "basic";
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const {
    includeLevel = "basic",
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const where = buildWhereClause({
    dateRange: filters.dateRange,
    searchTerm: filters.searchTerm,
    searchFields: SEARCH_FIELDS.workOrder,
    additionalConditions: filters.additionalConditions,
  });

  const include = OPTIMIZED_INCLUDES.workOrder[includeLevel];
  const orderBy = buildOrderBy(sortBy, sortOrder, SORT_FIELDS.workOrder);
  const pagination = buildPaginationOptions(page, pageSize);

  return {
    where,
    include,
    orderBy,
    ...pagination,
  };
}

/**
 * Build optimized repair report query
 */
export function buildRepairReportQuery(
  filters: {
    dateRange?: { from?: Date; to?: Date };
    searchTerm?: string;
    additionalConditions?: Record<string, any>;
  },
  options: {
    includeLevel?: "basic";
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const {
    includeLevel = "basic",
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const where = buildWhereClause({
    dateRange: filters.dateRange,
    searchTerm: filters.searchTerm,
    searchFields: SEARCH_FIELDS.repairReport,
    additionalConditions: filters.additionalConditions,
  });

  const include = OPTIMIZED_INCLUDES.repairReport[includeLevel];
  const orderBy = buildOrderBy(sortBy, sortOrder, SORT_FIELDS.repairReport);
  const pagination = buildPaginationOptions(page, pageSize);

  return {
    where,
    include,
    orderBy,
    ...pagination,
  };
}

/**
 * Complete query utility that combines common patterns
 */
export function buildCompleteQuery({
  searchParams,
  entityType,
  additionalConditions = {},
  sortBy,
  sortOrder = "desc",
}: {
  searchParams: URLSearchParams;
  entityType: keyof typeof SEARCH_FIELDS;
  additionalConditions?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const searchTerm = searchParams.get("q") || undefined;
  const { from, to } = parseDateParams(searchParams);
  const { page, pageSize } = parsePaginationParams(searchParams);

  const where = buildWhereClause({
    dateRange: { from, to },
    searchTerm,
    searchFields: SEARCH_FIELDS[entityType],
    additionalConditions,
  });

  const orderBy = buildOrderBy(
    sortBy || searchParams.get("sortBy") || "createdAt",
    sortOrder,
    SORT_FIELDS[entityType],
  );

  const pagination = buildPaginationOptions(page, pageSize);

  return {
    where,
    orderBy,
    ...pagination,
    page,
    pageSize,
  };
}
