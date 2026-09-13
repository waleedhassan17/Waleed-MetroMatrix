import {
  appointmentStatusMeta,
  dateFromKey,
  formatDateLabel,
  formatDayHeading,
  formatDuration,
  formatMonthYear,
  formatTime,
  formatTime12,
  formatTimeRange,
  isLiveWindow,
  minutesBetween,
  relativeStart,
  slotStateMeta,
} from '../doctorFormat';

describe('times', () => {
  it('formats 12- and 24-hour times, and nothing for garbage', () => {
    expect(formatTime12('00:05')).toBe('12:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('17:30')).toBe('5:30 PM');
    expect(formatTime('17:30', true)).toBe('17:30');
    expect(formatTime12('25:00')).toBe('');
    expect(formatTimeRange('09:00', '09:30')).toBe('9:00 AM – 9:30 AM');
  });

  it('measures and formats durations', () => {
    expect(minutesBetween('09:00', '10:15')).toBe(75);
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(75)).toBe('1 h 15 min');
    expect(formatDuration(0)).toBe('');
  });
});

describe('relative start and live window', () => {
  const now = new Date('2026-09-15T10:00:00.000Z');
  it('describes upcoming, in-progress and ended appointments', () => {
    expect(relativeStart('2026-09-15T10:25:00.000Z', '2026-09-15T10:55:00.000Z', now)).toBe('In 25 min');
    expect(relativeStart('2026-09-15T09:50:00.000Z', '2026-09-15T10:20:00.000Z', now)).toBe('In progress');
    expect(relativeStart('2026-09-16T10:00:00.000Z', '2026-09-16T10:30:00.000Z', now)).toBe('Tomorrow');
    expect(relativeStart('2026-09-15T09:00:00.000Z', '2026-09-15T09:30:00.000Z', now)).toBe('Ended 30 min ago');
    expect(relativeStart(null, null, now)).toBe('');
  });

  it('is live from ten minutes before until the end, not hours ahead', () => {
    expect(isLiveWindow('2026-09-15T10:08:00.000Z', '2026-09-15T10:38:00.000Z', now)).toBe(true);
    expect(isLiveWindow('2026-09-15T13:00:00.000Z', '2026-09-15T13:30:00.000Z', now)).toBe(false);
  });
});

describe('dates', () => {
  it('parses local keys and rejects impossible dates', () => {
    expect(dateFromKey('2026-09-15')?.getDate()).toBe(15);
    expect(dateFromKey('2026-02-30')).toBeNull();
  });
  it('labels days', () => {
    expect(formatDateLabel('2026-09-15')).toBe('Tue, 15 Sep');
    expect(formatDateLabel('2026-09-15', { weekday: false, year: true })).toBe('15 Sep 2026');
    expect(formatDayHeading('2026-09-16', '2026-09-15')).toBe('Tomorrow');
    expect(formatDayHeading('2026-09-18', '2026-09-15')).toBe('Fri, 18 Sep');
    expect(formatMonthYear('2026-09-15')).toBe('September 2026');
  });
});

describe('status labels', () => {
  it('gives every appointment status one label and tone', () => {
    expect(appointmentStatusMeta('pending')).toEqual({ label: 'Awaiting approval', tone: 'warning' });
    expect(appointmentStatusMeta('completed').tone).toBe('success');
    expect(appointmentStatusMeta('mystery')).toEqual({ label: 'Mystery', tone: 'neutral' });
  });
  it('names slot states the way a doctor reads them', () => {
    expect(slotStateMeta('blocked').label).toBe('Closed');
    expect(slotStateMeta('held').label).toBe('Unavailable');
  });
});
