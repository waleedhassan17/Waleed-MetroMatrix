import { formatMoney } from '../../../constants/Currency';
import { presentStatus } from '../../../hooks/useAdminMeta';
import { flattenPages, nextPageParam, type Page } from '../../../networks/admin/adminApi';
import { monthLabel, pktDate, rangeFor } from '../../../networks/admin/healthcareAnalyticsApi';
import { describeAction } from '../../../components/admin/StatusTimeline';
import { formatAgo, formatCount, formatDelta, formatPercent, formatRating, MISSING } from '../format';
import { parseWholeNumber } from '../parse';

describe('a value the server did not send is "—", never 0', () => {
  it.each([null, undefined, NaN, Infinity])('%s', (v) => {
    expect(formatCount(v as number)).toBe(MISSING);
    expect(formatMoney(v as number)).toBe(MISSING);
    expect(formatDelta(v as number)).toBe(MISSING);
    expect(formatPercent(v as number)).toBe(MISSING);
  });

  it('a real zero is still shown', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatMoney(0)).toBe('PKR 0');
    expect(formatDelta(0)).toBe('0%');
  });

  it('formats figures', () => {
    expect(formatCount(12480)).toBe('12,480');
    expect(formatMoney(3500)).toBe('PKR 3,500');
    expect(formatDelta(12.46)).toBe('+12.5%');
    expect(formatDelta(-3)).toBe('−3%');
    expect(formatPercent(87.44)).toBe('87.4%');
    expect(formatRating(4.66, 128)).toBe('4.7 (128)');
    expect(formatRating(null, 0)).toBe('No ratings yet');
  });

  it('formats elapsed time', () => {
    const now = Date.parse('2026-10-03T12:00:00Z');
    expect(formatAgo('2026-10-03T11:59:30Z', now)).toBe('just now');
    expect(formatAgo('2026-10-03T11:55:00Z', now)).toBe('5 min ago');
    expect(formatAgo('2026-10-03T09:00:00Z', now)).toBe('3 h ago');
    expect(formatAgo('2026-10-01T12:00:00Z', now)).toBe('2 days ago');
    expect(formatAgo(null, now)).toBe(MISSING);
  });
});

describe('presentStatus', () => {
  const meta = {
    enums: {
      providerStates: [
        { value: 'pending', label: 'Awaiting review', tone: 'warning' },
        { value: 'suspended', label: 'Suspended', tone: 'danger' },
      ],
    },
  } as any;

  it('uses the server label and maps its tone onto the theme', () => {
    expect(presentStatus(meta, 'providerStates', 'pending')).toEqual({ label: 'Awaiting review', tone: 'warning' });
    expect(presentStatus(meta, 'providerStates', 'suspended')).toEqual({ label: 'Suspended', tone: 'error' });
  });

  it('shows an unknown value as itself, in neutral — never a guess', () => {
    expect(presentStatus(meta, 'providerStates', 'archived')).toEqual({ label: 'archived', tone: 'neutral' });
    expect(presentStatus(undefined, 'providerStates', 'pending')).toEqual({ label: 'pending', tone: 'neutral' });
    expect(presentStatus(meta, 'providerStates', null)).toEqual({ label: '—', tone: 'neutral' });
  });
});

describe('list paging', () => {
  const page = (ids: string[], meta: Page<{ id: string }>['meta']): Page<{ id: string }> => ({ items: ids.map((id) => ({ id })), meta });

  it('follows the cursor, else the page number, else stops', () => {
    expect(nextPageParam(page([], { limit: 20, nextCursor: 'abc' }))).toEqual({ cursor: 'abc' });
    expect(nextPageParam(page([], { limit: 20, page: 1, pages: 3 }))).toEqual({ page: 2 });
    expect(nextPageParam(page([], { limit: 20, page: 3, pages: 3 }))).toBeUndefined();
    expect(nextPageParam(page([], { limit: 20 }))).toBeUndefined();
  });

  it('flattens pages without the duplicates a shifting list produces', () => {
    const pages = [page(['a', 'b'], { limit: 2 }), page(['b', 'c'], { limit: 2 })];
    expect(flattenPages(pages).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(flattenPages(undefined)).toEqual([]);
  });
});

describe('analytics ranges are in Pakistan time', () => {
  it('a UTC evening is already the next day in Pakistan', () => {
    expect(pktDate(new Date('2026-09-30T20:30:00Z'))).toBe('2026-10-01');
  });

  it('builds the date filter', () => {
    const now = new Date('2026-10-03T08:00:00Z');
    expect(rangeFor('month', now)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-03' });
    expect(rangeFor('90d', now)).toEqual({ startDate: '2026-07-06', endDate: '2026-10-03' });
    expect(rangeFor('all', now)).toEqual({});
  });

  it('labels months', () => {
    expect(monthLabel('2026-10')).toBe('Oct 2026');
    expect(monthLabel('2026-W40')).toBe('2026-W40');
  });
});

describe('misc', () => {
  it('describes audit actions', () => {
    expect(describeAction('provider.unsuspend')).toBe('Suspension lifted');
    expect(describeAction('user.deactivate')).toBe('Deactivated');
    expect(describeAction('provider.document_request')).toBe('Document request');
  });

  it('parses admin number input', () => {
    expect(parseWholeNumber('1,500')).toBe(1500);
    expect(parseWholeNumber('')).toBe(0);
    expect(parseWholeNumber(null)).toBe(0);
  });
});
