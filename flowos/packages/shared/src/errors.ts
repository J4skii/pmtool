/**
 * Structured error codes shared between API and frontend.
 * Every API error response is: { error: { code, message, details? } }
 */

export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_2FA_REQUIRED: 'AUTH_2FA_REQUIRED',
  AUTH_2FA_INVALID: 'AUTH_2FA_INVALID',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',

  // Tenancy / access
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Generic resource
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',

  // Domain
  SHEET_NOT_SHARED: 'SHEET_NOT_SHARED',
  SHEET_TAB_NOT_FOUND: 'SHEET_TAB_NOT_FOUND',
  SHEET_IMPORT_NOT_CONFIGURED: 'SHEET_IMPORT_NOT_CONFIGURED',
  TASK_CIRCULAR_DEPENDENCY: 'TASK_CIRCULAR_DEPENDENCY',
  TIMER_ALREADY_RUNNING: 'TIMER_ALREADY_RUNNING',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  INVOICE_IMMUTABLE: 'INVOICE_IMMUTABLE',
  AUTOMATION_LIMIT_REACHED: 'AUTOMATION_LIMIT_REACHED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',

  // Infra
  INTERNAL: 'INTERNAL',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}
