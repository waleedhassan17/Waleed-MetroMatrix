// ============================================================================
// Admin API errors and URL building — pure helpers (no network, no storage),
// so they are unit-testable on their own. Used by networks/admin/client.ts.
// ============================================================================

/**
 * A failed admin API call. `code` is the server's stable error code
 * (VALIDATION_FAILED, FORBIDDEN, DELETE_BLOCKED, …) — branch on it, never on
 * the message. NETWORK_ERROR / TIMEOUT mean the server was not reached.
 */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** The server said the admin lacks a permission (or must be a super admin). */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Field problems from a VALIDATION_FAILED response, if any. */
  get fieldErrors(): { field: string | null; message: string }[] {
    const fields = (this.details as { fields?: unknown } | undefined)?.fields;
    return Array.isArray(fields) ? (fields as { field: string | null; message: string }[]) : [];
  }
}

const CODE_FOR_STATUS: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_ATTEMPTS',
  503: 'MAINTENANCE',
};

/** Turn whatever axios threw into an AdminApiError. */
export function toAdminApiError(err: any): AdminApiError {
  if (err instanceof AdminApiError) return err;
  const response = err?.response;
  if (!response) {
    const timeout = err?.code === 'ECONNABORTED' || /timeout/i.test(String(err?.message));
    return new AdminApiError(
      0,
      timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      timeout ? 'The server took too long to answer.' : 'Could not reach the server. Check the connection and try again.'
    );
  }
  const body = response.data ?? {};
  const error = body.error;
  if (error && typeof error === 'object') {
    return new AdminApiError(response.status, String(error.code || CODE_FOR_STATUS[response.status] || 'ERROR'), String(error.message || 'Request failed'), error.details, body.requestId);
  }
  // Non-admin shapes ({ error: 'text' } / { message }) — should not happen on admin routes.
  const message = typeof error === 'string' ? error : body.message || 'Request failed';
  return new AdminApiError(response.status, CODE_FOR_STATUS[response.status] || (response.status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'), message, undefined, body.requestId);
}

/**
 * '/api/admin/providers/{providerId}' + { providerId } → '/admin/providers/abc'.
 * The axios base URL already ends in /api.
 */
export function buildAdminUrl(path: string, params?: Record<string, string | number> | null): string {
  let url = path.replace(/^\/api(?=\/)/, '');
  for (const [key, value] of Object.entries(params ?? {})) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
  }
  const missing = url.match(/\{(\w+)\}/);
  if (missing) throw new Error(`Missing path parameter '${missing[1]}' for ${path}`);
  return url;
}
