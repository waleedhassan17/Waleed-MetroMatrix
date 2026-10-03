// ============================================================================
// Home-services analytics for a period: bookings per Pakistan day, by category
// and status, paid revenue and the platform's commission, completion time,
// cancellations, and the busiest providers. Anything the server could not
// measure (no completed jobs yet) shows as "—".
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, BarList, KpiGrid, KpiTile, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { SegmentedControl } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { useGetHSAnalyticsQuery } from '../../../../networks/admin/homeServicesApi';
import { formatCount, formatPercent } from '../../../../utils/admin/format';
import { S } from '../../../../theme';
import { categoryLabel } from '../labels';

type RangeKey = '7d' | '30d' | '90d';
const RANGES: { value: RangeKey; label: string; days: number }[] = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
];
const DAYS = Object.fromEntries(RANGES.map((r) => [r.value, r.days])) as Record<RangeKey, number>;

export default function AdminHomeServiceAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [range, setRange] = useState<RangeKey>('30d');
  const window = useMemo(() => {
    const days = DAYS[range];
    const to = new Date();
    return { from: new Date(to.getTime() - days * 86_400_000).toISOString(), to: to.toISOString() };
  }, [range]);
  const analytics = useGetHSAnalyticsQuery(window);
  const a = analytics.data;
  const caption = `Last ${RANGES.find((r) => r.value === range)?.label}`;
  const totalBookings = a ? a.byStatus.reduce((sum, x) => sum + x.count, 0) : null;

  return (
    <AdminScreen title="Home-services analytics" refreshing={analytics.isFetching && !analytics.isLoading} onRefresh={analytics.refetch}>
      <PermissionGate all={['canManageHomeServices']} action="see home-services analytics">
        <SegmentedControl options={RANGES} value={range} onChange={setRange} style={{ marginBottom: S.lg }} />
        <QueryState isLoading={analytics.isLoading} error={analytics.error} onRetry={analytics.refetch} skeletonCount={3}>
          {a && (
            <>
              <Section title="Summary" caption={caption}>
                <KpiGrid>
                  <KpiTile label="Bookings" value={formatCount(totalBookings)} onPress={() => navigation.navigate('AdminHSBookings')} />
                  <KpiTile label="Paid booking value" value={formatMoney(a.revenue)} />
                  <KpiTile label="Platform commission" value={formatMoney(a.commission)} />
                  <KpiTile label="Cancelled or rejected" value={formatPercent(a.cancellationRate)} />
                  <KpiTile
                    label="Average job length"
                    value={a.averageCompletionMinutes === null ? '—' : `${formatCount(a.averageCompletionMinutes)} min`}
                    caption="Completed jobs"
                  />
                </KpiGrid>
              </Section>

              <Section title="Bookings per day" caption={`${caption}, Pakistan time`} card>
                <BarList
                  items={[...a.bookingsOverTime].reverse().map((d) => ({ key: d.date, label: d.date, value: d.count, display: formatCount(d.count) }))}
                  emptyText="No bookings in this period."
                />
              </Section>

              <Section title="By category" caption={caption} card>
                <BarList
                  items={[...a.byCategory]
                    .sort((x, y) => y.count - x.count)
                    .map((c) => ({ key: c.category, label: categoryLabel(meta, c.category), value: c.count, display: formatCount(c.count), detail: `${formatMoney(c.gross)} booked` }))}
                />
              </Section>

              <Section title="By status" caption={caption} card>
                <BarList
                  items={[...a.byStatus]
                    .sort((x, y) => y.count - x.count)
                    .map((s) => ({ key: s.status, label: presentStatus(meta, 'bookingStatuses', s.status).label, value: s.count, display: formatCount(s.count) }))}
                />
              </Section>

              <Section title="Busiest providers" caption={`${caption}, completed jobs`} card>
                <BarList
                  items={a.topProviders.map((p) => ({
                    key: p.id,
                    label: p.name,
                    value: p.jobs,
                    display: `${formatCount(p.jobs)} jobs`,
                    detail: `${formatMoney(p.gross)}${p.rating === null ? '' : ` · ${p.rating.toFixed(1)} ★`}`,
                  }))}
                  emptyText="No completed jobs in this period."
                />
              </Section>
            </>
          )}
        </QueryState>
      </PermissionGate>
    </AdminScreen>
  );
}
