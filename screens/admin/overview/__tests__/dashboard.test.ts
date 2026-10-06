jest.mock('react-native-svg', () => ({}));

import type { ConsoleMeta, ProviderTypeRegistrations } from '../../../../networks/admin/adminApi';
import {
  appointmentsPerDay,
  breakdownItems,
  completionSegments,
  consultationTypeSegments,
  deliveredOrdersPerDay,
  deliveredValuePerDay,
  fillByDay,
  providerTypeSegments,
  runningTotal,
  stateSegments,
  statusItems,
} from '../dashboardData';
import { rangeLabel, rangeWindow, windowDays } from '../dashboardRange';

const meta = {
  enums: {
    providerStates: [
      { value: 'incomplete', label: 'Not submitted', tone: 'neutral' },
      { value: 'pending', label: 'Awaiting review', tone: 'warning' },
      { value: 'approved', label: 'Approved', tone: 'success' },
      { value: 'rejected', label: 'Rejected', tone: 'danger' },
      { value: 'suspended', label: 'Suspended', tone: 'danger' },
    ],
    providerSubTypes: [{ value: 'electrician', label: 'Electrician', tone: 'neutral' }],
    bookingStatuses: [
      { value: 'COMPLETED', label: 'Completed', tone: 'success' },
      { value: 'PENDING', label: 'Pending', tone: 'warning' },
    ],
  },
} as unknown as ConsoleMeta;

const entry = (type: ProviderTypeRegistrations['type'], total: number): ProviderTypeRegistrations => ({
  type,
  total,
  byState: { incomplete: 0, pending: 0, approved: total, rejected: 0, suspended: 0 },
  registered: 0,
  daily: [],
  breakdown: null,
});

describe('the home charts window', () => {
  // 2026-10-07 02:00 in Pakistan is still the 6th in UTC — the window must use Pakistan days.
  const now = new Date('2026-10-06T21:00:00Z');

  it('covers the last N Pakistan days, today included', () => {
    const w = rangeWindow(7, now);
    expect(w.toKey).toBe('2026-10-07');
    expect(w.fromKey).toBe('2026-10-01');
    expect(windowDays(w)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('sends the module analytics the same instants their own screens send', () => {
    const w = rangeWindow(30, now);
    expect(w.to).toBe(now.toISOString());
    expect(Date.parse(w.to) - Date.parse(w.from)).toBe(30 * 86_400_000);
  });

  it('names the range', () => {
    expect(rangeLabel('90d')).toBe('Last 90 days');
  });
});

describe('series', () => {
  it('fills every day, summing what the server sent and 0 for the rest', () => {
    expect(fillByDay([{ date: 'b', value: 2 }, { date: 'b', value: 1 }, { date: 'x', value: 9 }], ['a', 'b', 'c'])).toEqual([
      { date: 'a', value: 0 },
      { date: 'b', value: 3 },
      { date: 'c', value: 0 },
    ]);
  });

  it('counts everyone registered by the end of each day', () => {
    expect(runningTotal(10, [{ date: 'a', count: 0 }, { date: 'b', count: 2 }, { date: 'c', count: 1 }]).map((p) => p.value)).toEqual([10, 12, 13]);
  });
});

describe('providers', () => {
  const colorOf = (t: string) => `c-${t}`;

  it('splits every provider by type, leaving "not chosen yet" out while it is empty', () => {
    const types = [entry('doctor', 3), entry('home_service', 5), entry('vendor', 2), entry('pending', 0)];
    expect(providerTypeSegments(types, colorOf)).toEqual([
      { key: 'doctor', label: 'Doctors', value: 3, color: 'c-doctor' },
      { key: 'home_service', label: 'Home service providers', value: 5, color: 'c-home_service' },
      { key: 'vendor', label: 'Shopping vendors', value: 2, color: 'c-vendor' },
    ]);
    expect(providerTypeSegments([...types.slice(0, 3), entry('pending', 4)], colorOf).map((s) => s.label)).toContain('Type not chosen yet');
  });

  it('shows states working-first, in the labels and tones of the rest of the console', () => {
    const segs = stateSegments(meta, { incomplete: 1, pending: 2, approved: 3, rejected: 4, suspended: 5 }, (tone) => `tone-${tone}`);
    expect(segs.map((s) => [s.label, s.value, s.color])).toEqual([
      ['Approved', 3, 'tone-success'],
      ['Awaiting review', 2, 'tone-warning'],
      ['Not submitted', 1, 'tone-neutral'],
      ['Rejected', 4, 'tone-error'],
      ['Suspended', 5, 'tone-error'],
    ]);
  });

  it('names a breakdown: trades from the server, the rest as spelled, and the remainder as Others', () => {
    const trades = breakdownItems(meta, {
      field: 'providerSubType',
      items: [
        { key: 'electrician', label: 'electrician', count: 4 },
        { key: 'ac_repairer', label: 'ac_repairer', count: 2 },
        { key: null, label: null, count: 1 },
      ],
      other: 0,
    });
    expect(trades.map((i) => i.label)).toEqual(['Electrician', 'Ac repairer', 'Not set']);

    const categories = breakdownItems(meta, { field: 'category', items: [{ key: 'fashion', label: 'fashion', count: 2 }], other: 3 });
    expect(categories).toEqual([
      { key: 'fashion', label: 'Fashion', value: 2, display: '2' },
      { key: 'others', label: 'Others', value: 3, display: '3' },
    ]);
    expect(breakdownItems(meta, null)).toEqual([]);
  });
});

describe('services', () => {
  it('lists statuses busiest first, by their server names, without the empty ones', () => {
    expect(statusItems(meta, 'bookingStatuses', [['PENDING', 2], ['COMPLETED', 5], ['CANCELLED', 0]]).map((i) => [i.label, i.value])).toEqual([
      ['Completed', 5],
      ['Pending', 2],
    ]);
  });

  const timeline = [
    { date: '2026-10-02', totalAppointments: 3, completedAppointments: 2, types: [{ type: 'in-clinic', total: 2, completed: 2 }, { type: 'video', total: 1, completed: 0 }] },
    { date: '2026-10-04', totalAppointments: 1, completedAppointments: 0, types: [{ type: 'in-clinic', total: 1, completed: 0 }] },
  ];

  it('draws appointments per day across the whole window', () => {
    expect(appointmentsPerDay(timeline, ['2026-10-02', '2026-10-03', '2026-10-04']).map((p) => p.value)).toEqual([3, 0, 1]);
  });

  it('splits appointments by kind, always showing both kinds', () => {
    expect(consultationTypeSegments(timeline, (i) => `s${i}`).map((s) => [s.label, s.value, s.color])).toEqual([
      ['In clinic', 3, 's0'],
      ['Video', 1, 's1'],
    ]);
    expect(consultationTypeSegments([], (i) => `s${i}`).map((s) => s.value)).toEqual([0, 0]);
  });

  it('splits booked appointments into completed and the rest', () => {
    expect(completionSegments(timeline, { done: 'g', rest: 'n' }).map((s) => s.value)).toEqual([2, 2]);
  });

  it('draws delivered orders and their value per day', () => {
    const series = [{ label: '2026-10-03', gmv: 1500, orders: 2 }];
    const days = ['2026-10-02', '2026-10-03'];
    expect(deliveredOrdersPerDay(series, days).map((p) => p.value)).toEqual([0, 2]);
    expect(deliveredValuePerDay(series, days).map((p) => p.value)).toEqual([0, 1500]);
  });
});
