import { NEXT_STATUSES, appointmentWhen, typeLabel } from '../appointmentLabels';

describe('appointment labels', () => {
  it('names the two appointment types, and shows anything else as itself', () => {
    expect(typeLabel('in-clinic')).toBe('In clinic');
    expect(typeLabel('video')).toBe('Video');
    expect(typeLabel('home-visit')).toBe('home-visit');
    expect(typeLabel(undefined)).toBe('');
  });

  it('says when, from the slot', () => {
    expect(appointmentWhen({ slotId: { date: '2026-10-12T00:00:00.000Z', startTime: '10:30' } })).toMatch(/10:30$/);
    expect(appointmentWhen({ slotId: null })).toBeNull();
  });

  it('offers only the moves the server allows', () => {
    expect(NEXT_STATUSES.pending).toEqual(['confirmed', 'cancelled']);
    expect(NEXT_STATUSES.confirmed).toEqual(['completed', 'cancelled']);
    expect(NEXT_STATUSES.completed).toEqual([]);
    expect(NEXT_STATUSES.cancelled).toEqual([]);
  });
});
