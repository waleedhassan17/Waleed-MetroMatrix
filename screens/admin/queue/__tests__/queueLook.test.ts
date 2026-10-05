import { queueIcon, waitTone } from '../queueLook';

describe('queue look', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  it('colours a wait by how long it has been', () => {
    expect(waitTone(hoursAgo(2), now)).toBeNull();
    expect(waitTone(hoursAgo(30), now)).toBe('warning');
    expect(waitTone(hoursAgo(80), now)).toBe('error');
    expect(waitTone(null, now)).toBeNull();
    expect(waitTone('not a date', now)).toBeNull();
  });

  it('has an icon per kind of work, and a default', () => {
    expect(queueIcon('payout_request')).toBe('cash-outline');
    expect(queueIcon('something_new')).toBe('file-tray-full-outline');
  });
});
