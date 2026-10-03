// ============================================================================
// Parsing admin form input. Distinct from displaying server data: an admin who
// clears a number field means 0; a server that sent nothing means "—".
// ============================================================================

/** "1,500" → 1500, "" → 0, "abc" → 0. Digits only: no signs or decimals. */
export function parseWholeNumber(text: string | null | undefined): number {
  const digits = String(text ?? '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

/**
 * A new brand's return window before the admin sets one. Mirrors the backend
 * shopping setting `defaultReturnDays` default (7); the server applies its own
 * configured value when the brand is saved without one.
 */
export const DEFAULT_RETURN_DAYS = 7;
