import { metricCaption, metricTone, metricValue, type Metric } from '../metrics';

const m = (over: Partial<Metric>): Metric => ({ key: 'k', label: 'L', value: 0, unit: 'count', period: 'today', ...over });

describe('overview metrics', () => {
  it('formats by unit, and shows "—" for a value the server could not compute', () => {
    expect(metricValue(m({ value: 1234 }))).toBe('1,234');
    expect(metricValue(m({ value: 87.44, unit: 'percent' }))).toBe('87.4%');
    expect(metricValue(m({ value: 3500, unit: 'PKR' }))).toBe('PKR 3,500');
    expect(metricValue(m({ value: null }))).toBe('—');
  });

  it('always states the period, and the comparison when there is one', () => {
    expect(metricCaption(m({ period: 'today' }))).toBe('Today');
    expect(metricCaption(m({ period: 'all_time' }))).toBe('All time');
    expect(metricCaption(m({ period: 'month_to_date', delta: 12.5, comparedTo: 'same_period_last_month' }))).toBe(
      'Month to date · +12.5% vs same period last month'
    );
    expect(metricCaption(m({ period: 'month_to_date', delta: null, comparedTo: 'same_period_last_month' }))).toBe(
      'Month to date · no baseline last month'
    );
  });

  it('flags non-zero backlogs', () => {
    expect(metricTone(m({ key: 'open_disputes', value: 2 }))).toBe('warning');
    expect(metricTone(m({ key: 'open_disputes', value: 0 }))).toBe('neutral');
    expect(metricTone(m({ key: 'bookings_today', value: 9 }))).toBe('neutral');
  });
});
