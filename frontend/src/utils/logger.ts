/**
 * Frontend logger with levels, dev console output, and optional backend error reporting.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: number | string | null;
  userPhone?: string;
  role?: string | null;
  tenantId?: number | string | null;
  requestId?: string;
}

type LogReporter = (level: LogLevel, message: string, context?: Record<string, unknown>) => void;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const CONSOLE_FN: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let minLevel: LogLevel = import.meta.env.DEV ? "debug" : "warn";
let context: LogContext = {};
let remoteReporter: LogReporter | null = null;
let requestId: string | null = null;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const rid = context.requestId || requestId || "-";
  const role = context.role || "-";
  return `[${level.toUpperCase()}] rid=${rid} role=${role} | ${message}`;
}

function emit(level: LogLevel, message: string, extra?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, message);
  if (import.meta.env.DEV || level === "error" || level === "warn") {
    CONSOLE_FN[level](formatted, extra ?? "");
  }

  if (level === "error" || level === "warn") {
    remoteReporter?.(level, message, { ...context, ...extra });
  }
}

export const logger = {
  setLevel(level: LogLevel) {
    minLevel = level;
  },

  setContext(partial: LogContext) {
    context = { ...context, ...partial };
  },

  clearContext() {
    context = {};
  },

  getContext(): LogContext {
    return { ...context };
  },

  setRequestId(id: string | null) {
    requestId = id;
    context = { ...context, requestId: id ?? undefined };
  },

  getRequestId(): string | null {
    return requestId;
  },

  setRemoteReporter(reporter: LogReporter | null) {
    remoteReporter = reporter;
  },

  debug(message: string, extra?: Record<string, unknown>) {
    emit("debug", message, extra);
  },

  info(message: string, extra?: Record<string, unknown>) {
    emit("info", message, extra);
  },

  warn(message: string, extra?: Record<string, unknown>) {
    emit("warn", message, extra);
  },

  error(message: string, extra?: Record<string, unknown>) {
    emit("error", message, extra);
  },
};

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
