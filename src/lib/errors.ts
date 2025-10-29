// Centralized error handling utilities for both server and client usage.
// - Provides ErrorCode enum and AppError class for throwing categorized errors
// - Builds JSON error responses with consistent shape
// - Maps Zod and (optionally) Prisma errors into actionable messages
// - Includes a client-safe parser for fetch() error responses

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export type ErrorDetails =
  | undefined
  | {
      // For validation errors (Zod)
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
      // For auth/permission context
      currentRole?: string | null;
      requiredRole?: string | string[];
      // For database or other extra info
      reason?: string;
      [key: string]: unknown;
    };

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: ErrorDetails;
  constructor(
    code: ErrorCode,
    message: string,
    options?: { status?: number; details?: ErrorDetails },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? mapCodeToStatus(code);
    this.details = options?.details;
  }

  static unauthorized(message = "Akses membutuhkan login.") {
    return new AppError(ErrorCode.UNAUTHORIZED, message, { status: 401 });
  }
  static forbidden(currentRole?: string | null, requiredRole?: string | string[]) {
    const required = Array.isArray(requiredRole) ? requiredRole.join(" | ") : requiredRole;
    const msg = `Akses ditolak. Anda tidak memiliki izin untuk mengakses fitur ini. Role Anda: ${currentRole ?? "unknown"}${
      required ? ", Required: " + required : ""
    }`;
    return new AppError(ErrorCode.FORBIDDEN, msg, {
      status: 403,
      details: { currentRole: currentRole ?? null, requiredRole: requiredRole },
    });
  }
  static notFound(message = "Data tidak ditemukan.") {
    return new AppError(ErrorCode.NOT_FOUND, message, { status: 404 });
  }
  static validation(details?: ErrorDetails, message = "Validasi gagal. Periksa input Anda.") {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, { status: 400, details });
  }
  static server(reason?: string) {
    const msg = reason
      ? `Gagal memproses permintaan. Error: ${reason}. Silakan coba lagi atau hubungi admin.`
      : "Gagal memproses permintaan. Silakan coba lagi atau hubungi admin.";
    return new AppError(ErrorCode.SERVER_ERROR, msg, {
      status: 500,
      details: reason ? { reason } : undefined,
    });
  }
  static db(reason?: string) {
    const msg = reason
      ? `Gagal menyimpan data. Error: ${reason}. Silakan coba lagi atau hubungi admin.`
      : "Gagal menyimpan data. Silakan coba lagi atau hubungi admin.";
    return new AppError(ErrorCode.DATABASE_ERROR, msg, {
      status: 500,
      details: reason ? { reason } : undefined,
    });
  }
}

export function mapCodeToStatus(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
      return 400;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.SERVER_ERROR:
    default:
      return 500;
  }
}

type ErrorBody = {
  success: false;
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
};

function buildBody(code: ErrorCode, message: string, details?: ErrorDetails): ErrorBody {
  return { success: false, code, message, ...(details ? { details } : {}) } as ErrorBody;
}

// Server-only logger importer (avoids bundling server env in client)
async function logServerError(error: unknown, meta?: Record<string, unknown>) {
  if (typeof window !== "undefined") return; // no-op on client
  try {
    const { logger } = await import("./logger");
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      // Production: only log code/meta to avoid leaking stack
      logger.error({ ...(meta || {}), kind: "AppError" });
    } else {
      // Development: log full error + meta
      logger.error(error, meta);
    }
  } catch {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

export function errorResponse(
  codeOrError: ErrorCode | AppError,
  message?: string,
  options?: { status?: number; details?: ErrorDetails },
): Response {
  const isApp = codeOrError instanceof AppError;
  const code = isApp ? (codeOrError as AppError).code : (codeOrError as ErrorCode);
  const status = isApp
    ? (codeOrError as AppError).status
    : (options?.status ?? mapCodeToStatus(code as ErrorCode));
  const msg = isApp ? (codeOrError as AppError).message : message || "Terjadi kesalahan.";
  const details = isApp ? (codeOrError as AppError).details : options?.details;
  const body = buildBody(code as ErrorCode, msg, details);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Main catch-all handler for API route catch blocks
export async function handleApiError(error: unknown): Promise<Response> {
  // Zod error detection without importing zod here
  const isZod = typeof (error as any)?.name === "string" && (error as any).name === "ZodError";
  if (isZod) {
    const flatten = (error as any)?.flatten?.();
    await logServerError(error, { code: ErrorCode.VALIDATION_ERROR });
    return errorResponse(AppError.validation(flatten));
  }

  // Prisma error heuristic: has string .code like P2002 etc.
  const prismaCode = (error as any)?.code;
  if (typeof prismaCode === "string" && /^P\d{4}/.test(prismaCode)) {
    const reason = (error as any)?.meta?.cause || (error as any)?.message || prismaCode;
    await logServerError(error, { code: ErrorCode.DATABASE_ERROR });
    return errorResponse(AppError.db(typeof reason === "string" ? reason : String(reason)));
  }

  // Already an AppError
  if (error instanceof AppError) {
    await logServerError(error, { code: error.code });
    return errorResponse(error);
  }

  // Generic fallback
  const reason = (error as any)?.message || undefined;
  await logServerError(error, { code: ErrorCode.SERVER_ERROR });
  return errorResponse(AppError.server(typeof reason === "string" ? reason : undefined));
}

// Client/server-safe parser for fetch() responses
export async function parseErrorResponse(res: Response): Promise<{
  status: number;
  code?: ErrorCode;
  message: string;
  details?: ErrorDetails;
}> {
  const status = res.status;
  try {
    const data = await res.json();
    // New shape
    if (data && typeof data === "object" && ("code" in data || "message" in data)) {
      const code = data.code as ErrorCode | undefined;
      const message = (data.message as string) || defaultMessageForStatus(status);
      const details = data.details as ErrorDetails | undefined;
      return { status, code, message, details };
    }
    // Backward-compat for old { error: ... }
    if (data && typeof data === "object" && "error" in data) {
      const e = (data as any).error;
      const message = typeof e === "string" ? e : defaultMessageForStatus(status);
      return { status, message };
    }
  } catch {
    // fallthrough
  }
  return { status, message: defaultMessageForStatus(status) };
}

function defaultMessageForStatus(status: number): string {
  if (status === 401) return "Akses membutuhkan login.";
  if (status === 403) return "Akses ditolak.";
  if (status === 404) return "Data tidak ditemukan.";
  if (status >= 500) return "Terjadi kesalahan pada server.";
  return "Terjadi kesalahan pada permintaan.";
}
