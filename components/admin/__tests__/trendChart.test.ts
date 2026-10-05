jest.mock('react-native-svg', () => ({}));

import { bucketLabel } from '../TrendChart';

describe('TrendChart bucket labels', () => {
  it('names days and months the way the axis shows them', () => {
    expect(bucketLabel('2026-10-05')).toBe('Oct 5');
    expect(bucketLabel('2026-10')).toBe('Oct');
    expect(bucketLabel('2026-10', true)).toBe('Oct 2026');
    expect(bucketLabel('not a date')).toBe('not a date');
  });
});
