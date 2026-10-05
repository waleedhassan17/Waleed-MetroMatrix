import { fillDays } from '../days';

describe('fillDays', () => {
  // 21:00 UTC on 5 October is 02:00 on 6 October in Pakistan.
  const now = Date.parse('2026-10-05T21:00:00Z');

  it('lists every Pakistan day in the range, oldest first, with zero for days the server did not list', () => {
    const days = fillDays([{ date: '2026-10-05', count: 3 }], 3, now);
    expect(days).toEqual([
      { date: '2026-10-04', value: 0 },
      { date: '2026-10-05', value: 3 },
      { date: '2026-10-06', value: 0 },
    ]);
  });

  it('ignores days outside the range', () => {
    expect(fillDays([{ date: '2026-01-01', count: 9 }], 2, now).map((d) => d.value)).toEqual([0, 0]);
  });
});
