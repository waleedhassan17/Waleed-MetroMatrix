import { fromInputValue, toInputValue } from '../PlatformDateTimePicker.web';

// 6 Sep 2026, 14:05 local time.
const base = new Date(2026, 8, 6, 14, 5, 30);

describe('web date/time input values', () => {
  it('writes local values the input understands', () => {
    expect(toInputValue(base, 'date')).toBe('2026-09-06');
    expect(toInputValue(base, 'time')).toBe('14:05');
    expect(toInputValue(base, 'datetime')).toBe('2026-09-06T14:05');
  });

  it('reads a date as that local day, keeping the time of day', () => {
    const d = fromInputValue('2026-12-25', 'date', base)!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 25]);
    expect([d.getHours(), d.getMinutes()]).toEqual([14, 5]);
  });

  it('reads a time onto the same day', () => {
    const d = fromInputValue('09:30', 'time', base)!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 8, 6, 9, 30]);
  });

  it('reads a date and time together', () => {
    const d = fromInputValue('2027-01-02T07:45', 'datetime', base)!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2027, 0, 2, 7, 45]);
  });

  it('ignores a year still being typed and an emptied field', () => {
    expect(fromInputValue('0002-09-06', 'date', base)).toBeUndefined();
    expect(fromInputValue('0202-09-06', 'date', base)).toBeUndefined();
    expect(fromInputValue('', 'date', base)).toBeUndefined();
    expect(fromInputValue('', 'time', base)).toBeUndefined();
  });

  it('round-trips', () => {
    for (const mode of ['date', 'time', 'datetime'] as const) {
      expect(toInputValue(fromInputValue(toInputValue(base, mode), mode, base)!, mode)).toBe(toInputValue(base, mode));
    }
  });
});
