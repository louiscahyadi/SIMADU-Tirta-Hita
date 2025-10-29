/*
  Lightweight logger utility with log levels and env-aware behavior.

  - Development: delegates to console.* for all levels
  - Production:
      - debug/info: no-op (suppressed)
      - warn: minimal console.warn on server only
      - error: always console.error and optionally forward to an external reporter

  Future integration: call `setErrorReporter()` to plug monitoring (e.g., Sentry)
  without changing call sites in the app code.
*/

import { env } from "./env";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

type ErrorReporter = (error: unknown, context?: { message?: string; extra?: any }) => void;

const isServer = typeof window === "undefined";
const isDev = env.NODE_ENV !== "production";

let externalErrorReporter: ErrorReporter | undefined;

export function setErrorReporter(reporter?: ErrorReporter) {
  externalErrorReporter = reporter;
}

function safeStringify(v: unknown): string {
  try {
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function logToConsole(level: Exclude<LogLevel, "silent">, args: unknown[]) {
  // Map to console functions
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "info"
          ? console.info
          : console.debug;
  // eslint-disable-next-line no-console
  fn(...args);
}

function prodLog(level: Exclude<LogLevel, "silent">, args: unknown[]) {
  if (level === "debug" || level === "info") return; // suppressed in production
  if (level === "warn") {
    // Keep server logs minimal; avoid noisy client warnings in production
    if (isServer) logToConsole("warn", args);
    return;
  }
  if (level === "error") {
    // Always surface errors
    logToConsole("error", args);
  }
}

export const logger = {
  level(): LogLevel {
    return isDev ? "debug" : "warn";
  },
  debug: (...args: unknown[]) => {
    if (isDev) logToConsole("debug", args);
  },
  info: (...args: unknown[]) => {
    if (isDev) logToConsole("info", args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) logToConsole("warn", args);
    else prodLog("warn", args);
  },
  // Prefer passing the actual error object as the first argument when available
  error: (errorOrMessage?: unknown, ...rest: unknown[]) => {
    if (isDev) {
      logToConsole("error", [errorOrMessage, ...rest]);
      return;
    }

    // Production path: console + optional external reporter
    prodLog("error", [errorOrMessage, ...rest]);

    if (externalErrorReporter) {
      try {
        const message = typeof errorOrMessage === "string" ? errorOrMessage : undefined;
        const err = errorOrMessage instanceof Error ? errorOrMessage : undefined;
        externalErrorReporter(err ?? errorOrMessage, {
          message,
          extra: rest?.length ? rest.map(safeStringify).join(" ") : undefined,
        });
      } catch {
        // Never throw from logging
      }
    }
  },
} as const;

export type Logger = typeof logger;
