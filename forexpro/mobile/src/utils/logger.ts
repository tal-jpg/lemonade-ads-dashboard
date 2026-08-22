import {
  getCrashlytics,
  log as crashLog,
  recordError,
  setUserId,
  setAttribute,
} from '@react-native-firebase/crashlytics';

/**
 * Logging.
 *
 * In development everything goes to the console. In release, breadcrumbs and
 * non-fatal errors go to Crashlytics instead — never to the console, so nothing
 * sensitive is written to device logs.
 */

const isDev = __DEV__;

function instance(): ReturnType<typeof getCrashlytics> | null {
  try {
    return getCrashlytics();
  } catch {
    // Crashlytics is unavailable until the native module is initialised (e.g.
    // in a bare JS test environment). Logging must never crash the app.
    return null;
  }
}

export const log = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) console.log(`[debug] ${message}`, ...args);
  },

  info(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.info(`[info] ${message}`, ...args);
      return;
    }
    const c = instance();
    if (c) crashLog(c, message);
  },

  warn(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.warn(`[warn] ${message}`, ...args);
      return;
    }
    const c = instance();
    if (c) crashLog(c, `WARN ${message}`);
  },

  /** Records a non-fatal error. Always safe to call. */
  error(message: string, error?: unknown): void {
    if (isDev) {
      console.error(`[error] ${message}`, error);
      return;
    }
    const c = instance();
    if (!c) return;
    crashLog(c, message);
    if (error instanceof Error) {
      recordError(c, error);
    } else if (error !== undefined) {
      recordError(c, new Error(`${message}: ${String(error)}`));
    }
  },

  /** Associates subsequent crash reports with a user, without any PII. */
  setUser(uid: string | null): void {
    const c = instance();
    if (c) void setUserId(c, uid ?? '');
  },

  setContext(key: string, value: string | number | boolean): void {
    const c = instance();
    if (c) void setAttribute(c, key, String(value));
  },
};
