import {
  addDaysToKey,
  blankWeek,
  daysBetweenKeys,
  EditableDay,
  mondayOf,
  normalizeWeek,
  slotsInRange,
  suggestNextRange,
  toServerWeek,
  validateDay,
  validateWeek,
  weekOf,
  weeklySlotCount,
} from '../timeRanges';

const day = (overrides: Partial<EditableDay>): EditableDay => ({
  day: 'Monday',
  isWorking: true,
  online: { enabled: false, ranges: [] },
  onsite: { enabled: false, ranges: [] },
  ...overrides,
});

describe('validateDay', () => {
  it('accepts minute-precision periods', () => {
    const r = validateDay(
      day({ onsite: { enabled: true, ranges: [{ startTime: '09:07', endTime: '12:52', clinicId: 'c1' }] } }),
      { slotDuration: 20 }
    );
    expect(r.issues).toEqual([]);
  });

  it('flags a reversed period, a too-short period and a missing clinic', () => {
    const r = validateDay(
      day({
        onsite: {
          enabled: true,
          ranges: [
            { startTime: '12:00', endTime: '11:00', clinicId: 'c1' },
            { startTime: '14:00', endTime: '14:10' },
          ],
        },
      }),
      { slotDuration: 30 }
    );
    expect(r.issues.map((i) => i.code)).toEqual(['START_NOT_BEFORE_END', 'RANGE_SHORTER_THAN_SLOT', 'CLINIC_REQUIRED']);
  });

  it('two in-clinic periods may not overlap, even at different clinics', () => {
    const r = validateDay(
      day({
        onsite: {
          enabled: true,
          ranges: [
            { startTime: '09:00', endTime: '12:00', clinicId: 'c1' },
            { startTime: '11:00', endTime: '13:00', clinicId: 'c2' },
          ],
        },
      }),
      { slotDuration: 30 }
    );
    expect(r.issues).toEqual([expect.objectContaining({ mode: 'onsite', index: 1, code: 'OVERLAP_SAME_MODE' })]);
  });

  it('video overlapping in-clinic is only a warning', () => {
    const r = validateDay(
      day({
        online: { enabled: true, ranges: [{ startTime: '10:00', endTime: '11:00' }] },
        onsite: { enabled: true, ranges: [{ startTime: '10:30', endTime: '12:00', clinicId: 'c1' }] },
      }),
      { slotDuration: 30 }
    );
    expect(r.issues).toEqual([]);
    expect(r.warnings[0]).toContain('10:30–11:00');
  });

  it('ignores days off and switched-off modes', () => {
    expect(
      validateDay(day({ isWorking: false, online: { enabled: true, ranges: [{ startTime: 'x', endTime: 'y' }] } }), {
        slotDuration: 30,
      }).issues
    ).toEqual([]);
  });
});

describe('validateWeek', () => {
  it('reports hasErrors only when some day has an issue', () => {
    const week = blankWeek();
    expect(validateWeek(week, { slotDuration: 30 }).hasErrors).toBe(false);
    week[0] = day({ online: { enabled: true, ranges: [{ startTime: '10:00', endTime: '09:00' }] } });
    expect(validateWeek(week, { slotDuration: 30 }).hasErrors).toBe(true);
  });
});

describe('slot counts', () => {
  it('counts slots with and without a buffer', () => {
    expect(slotsInRange({ startTime: '09:00', endTime: '10:00' }, 30)).toBe(2);
    expect(slotsInRange({ startTime: '09:00', endTime: '10:00' }, 20, 10)).toBe(2);
    expect(slotsInRange({ startTime: '09:00', endTime: '09:15' }, 20)).toBe(0);
  });

  it('counts a week, leaving out video when it is switched off', () => {
    const week = [
      day({
        online: { enabled: true, ranges: [{ startTime: '17:00', endTime: '18:00' }] },
        onsite: { enabled: true, ranges: [{ startTime: '09:00', endTime: '10:00', clinicId: 'c1' }] },
      }),
    ];
    expect(weeklySlotCount(week, 30)).toBe(4);
    expect(weeklySlotCount(week, 30, 0, { videoEnabled: false })).toBe(2);
  });
});

describe('suggestNextRange', () => {
  it('starts the first period at 9 AM', () => {
    expect(suggestNextRange([], 30)).toEqual({ startTime: '09:00', endTime: '12:00' });
  });
  it('leaves an hour after the last period', () => {
    expect(suggestNextRange([{ startTime: '09:00', endTime: '13:00' }], 30)).toEqual({
      startTime: '14:00',
      endTime: '17:00',
    });
  });
  it('never starts inside the day end, and gives up when there is no room', () => {
    expect(suggestNextRange([{ startTime: '20:00', endTime: '23:30' }], 30)).toBeNull();
  });
});

describe('week shape round-trip', () => {
  it('normalises server data Monday-first with the day-level clinic as fallback', () => {
    const week = normalizeWeek([
      {
        day: 'Wednesday',
        isWorking: true,
        onsite: { enabled: true, clinicId: 'old', ranges: [{ startTime: '09:00', endTime: '12:00' }] },
      },
    ]);
    expect(week.map((d) => d.day)[0]).toBe('Monday');
    expect(week[2].onsite.ranges[0].clinicId).toBe('old');
    expect(toServerWeek(week)[2].onsite.ranges[0]).toEqual({ startTime: '09:00', endTime: '12:00', clinicId: 'old' });
  });
});

describe('calendar keys', () => {
  it('moves across month ends and finds Monday', () => {
    expect(addDaysToKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(mondayOf('2026-09-20')).toBe('2026-09-14');
    expect(weekOf('2026-09-17')).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
    expect(daysBetweenKeys('2026-09-01', '2026-09-15')).toBe(14);
  });
});
