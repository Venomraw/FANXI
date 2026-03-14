/**
 * Frontend observability logger.
 *
 * - In development: logs to console with structured context
 * - Failed API calls, WebSocket failures, and polling retries are always logged
 * - Production: logs errors only
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  // Always log errors; info/warn only in dev
  if (level === 'info' && !isDev) return;
  if (level === 'warn' && !isDev) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...context,
  };

  if (level === 'error') {
    console.error(`[FanXI] ${message}`, context ?? '');
  } else if (level === 'warn') {
    console.warn(`[FanXI] ${message}`, context ?? '');
  } else {
    console.log(`[FanXI]`, entry);
  }
}

export const fanxiLog = {
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),

  /** Log a failed API call */
  apiError: (url: string, status: number, detail?: string) =>
    log('error', 'API call failed', { url, status, detail }),

  /** Log a WebSocket connection failure */
  wsError: (matchId: number, error: string) =>
    log('error', 'WebSocket connection failed', { matchId, error }),

  /** Log a WebSocket disconnect */
  wsDisconnect: (matchId: number, code?: number) =>
    log('warn', 'WebSocket disconnected', { matchId, code }),

  /** Log backend-ready polling (dev only) */
  pollRetry: (attempt: number, delay: number) =>
    log('info', 'Backend health poll retry', { attempt, delay }),
};
