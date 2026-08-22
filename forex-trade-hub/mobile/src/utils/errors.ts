/**
 * Error normalisation.
 *
 * Firebase error codes are never shown to a user. Everything that reaches the
 * UI goes through `toAppError`, which produces a short, human sentence and a
 * flag for whether retrying makes sense.
 */

export type AppError = {
  code: string;
  message: string;
  /** True when the action is worth offering a Retry button for. */
  retryable: boolean;
  cause?: unknown;
};

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
  'auth/user-not-found': 'No account found with those details.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'No internet connection. Check your network and try again.',
  'auth/requires-recent-login': 'Please sign in again to complete this change.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

const FIRESTORE_MESSAGES: Record<string, string> = {
  'permission-denied': "You don't have access to this content.",
  unavailable: 'Connection problem. Check your network and try again.',
  'deadline-exceeded': 'That took too long. Please try again.',
  'not-found': 'This content is no longer available.',
  'already-exists': 'That already exists.',
  cancelled: 'The request was cancelled.',
  'resource-exhausted': 'Too many requests. Please slow down and try again.',
  unauthenticated: 'Please sign in to continue.',
  'failed-precondition': 'This action is not available right now.',
};

const RETRYABLE = new Set([
  'auth/network-request-failed',
  'auth/too-many-requests',
  'unavailable',
  'deadline-exceeded',
  'internal',
  'cancelled',
  'resource-exhausted',
  'unknown',
  'network',
]);

function extractCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'unknown';
}

export function toAppError(err: unknown, fallback = 'Something went wrong. Please try again.'): AppError {
  const code = extractCode(err);

  const known = AUTH_MESSAGES[code] ?? FIRESTORE_MESSAGES[code];
  if (known) {
    return { code, message: known, retryable: RETRYABLE.has(code), cause: err };
  }

  if (err instanceof Error && /network|offline|timeout/i.test(err.message)) {
    return {
      code: 'network',
      message: 'No internet connection. Check your network and try again.',
      retryable: true,
      cause: err,
    };
  }

  return { code, message: fallback, retryable: RETRYABLE.has(code), cause: err };
}

export function isPermissionDenied(err: unknown): boolean {
  return extractCode(err) === 'permission-denied';
}

export function isOffline(err: unknown): boolean {
  const code = extractCode(err);
  return code === 'unavailable' || code === 'auth/network-request-failed' || code === 'network';
}

/** Throwable variant, for use inside services. */
export class ServiceError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'ServiceError';
    this.code = appError.code;
    this.retryable = appError.retryable;
  }
}

export function serviceError(err: unknown, fallback?: string): ServiceError {
  return new ServiceError(toAppError(err, fallback));
}
