// ============================================
// Shopping Home — Serializer
// ============================================

/**
 * Serialise query params for the home-feed endpoint.
 * Strips undefined values so the URL stays clean.
 */
export function serializeHomeRequest(params?: {
  page?: number;
  limit?: number;
  userId?: string;
}): Record<string, string> {
  if (!params) return {};
  const out: Record<string, string> = {};
  if (params.page !== undefined) out.page = String(params.page);
  if (params.limit !== undefined) out.limit = String(params.limit);
  if (params.userId) out.userId = params.userId;
  return out;
}
