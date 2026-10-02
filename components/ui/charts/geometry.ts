// Pure chart geometry — scales, clean ticks, SVG paths. No React, so it is
// unit-tested directly (components/ui/charts/__tests__).

/** The smallest "clean" number ≥ v: 1, 2, 2.5, 5 × 10^n. Axes read 0 / 5 / 10, never 0 / 4.7 / 9.4. */
export function niceCeil(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * base >= v - 1e-9) return m * base;
  }
  return 10 * base;
}

/** Three ticks from 0 to a clean max that covers `max`. */
export function ticks(max: number, count = 3): number[] {
  const top = niceCeil(max);
  const step = top / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(step * i * 100) / 100);
}

export interface Frame {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export const xAt = (i: number, n: number, f: Frame) =>
  f.padLeft + (n <= 1 ? (f.width - f.padLeft - f.padRight) / 2 : (i / (n - 1)) * (f.width - f.padLeft - f.padRight));

export const yAt = (v: number, max: number, f: Frame) =>
  f.padTop + (1 - Math.min(Math.max(v / (max || 1), 0), 1)) * (f.height - f.padTop - f.padBottom);

/** "M x y L x y …" through points, skipping nulls (a gap is a gap, not a zero). */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    pen = true;
  }
  return d.trim();
}

/** Closed band between an upper and a lower edge (same xs). */
export function bandPath(upper: { x: number; y: number }[], lower: { x: number; y: number }[]): string {
  if (!upper.length) return '';
  const top = upper.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bottom = [...lower].reverse().map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return `${top} ${bottom} Z`;
}

/** Index of the data position nearest a touch x (the crosshair snaps to dates, not pixels). */
export function nearestIndex(touchX: number, n: number, f: Frame): number {
  if (n <= 1) return 0;
  const span = f.width - f.padLeft - f.padRight;
  const i = Math.round(((touchX - f.padLeft) / span) * (n - 1));
  return Math.min(Math.max(i, 0), n - 1);
}

/** 'YYYY-MM-DD' → 'Sep 30' (the date is a calendar day; no timezone maths). */
export function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

/** Auto-compact a count for labels: 950 / 1.2K / 12.9K / 1.3M. */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(0)}K`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
