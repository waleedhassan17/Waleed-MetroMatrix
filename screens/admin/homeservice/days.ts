// Pakistan calendar days for charts. Pure, so it is tested.

const DAY_MS = 86_400_000;
const PKT_OFFSET_MS = 5 * 3_600_000; // Pakistan has no daylight saving

/**
 * The last `days` Pakistan calendar days, oldest first. The server lists only
 * days that had bookings, so a day it does not list had none — a real zero.
 */
export function fillDays(counts: { date: string; count: number }[], days: number, now = Date.now()) {
  const byDate = new Map(counts.map((c) => [c.date, c.count]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now - (days - 1 - i) * DAY_MS + PKT_OFFSET_MS).toISOString().slice(0, 10);
    const count = byDate.get(date);
    return { date, value: count === undefined ? 0 : count };
  });
}
