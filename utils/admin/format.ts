// ============================================================================
// Number, percentage and time formatting for the admin console.
//
// One rule: a value the server did not send is shown as "—", never as 0. A
// zero the server DID send is a fact ("0 pending"); a zero the app invented is
// a lie that looks exactly like it. Money goes through constants/Currency.ts
// formatMoney, which follows the same rule.
// ============================================================================

export const MISSING = '—';

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 12,480 — or "—". */
export const formatCount = (value: number | null | undefined): string =>
  isNumber(value) ? value.toLocaleString('en-PK') : MISSING;

/** "+12.5%" / "−3%" / "0%" — or "—" when there is no baseline (the server sends null). */
export function formatDelta(value: number | null | undefined): string {
  if (!isNumber(value)) return MISSING;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0%';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toLocaleString('en-PK')}%`;
}

/** "87.4%" — or "—". */
export const formatPercent = (value: number | null | undefined): string =>
  isNumber(value) ? `${Math.round(value * 10) / 10}%` : MISSING;

/** "4.6 (128)" for a rating — or "No ratings yet". */
export function formatRating(average: number | null | undefined, count: number | null | undefined): string {
  if (!isNumber(average) || !isNumber(count) || count === 0) return 'No ratings yet';
  return `${average.toFixed(1)} (${count.toLocaleString('en-PK')})`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", then the date. */
export function formatAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return MISSING;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return MISSING;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

/** "3 Oct 2026" in Pakistan time — or "—". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return MISSING;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return MISSING;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
}

/** "3 Oct 2026, 14:05" in Pakistan time — or "—". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return MISSING;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return MISSING;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  });
}
