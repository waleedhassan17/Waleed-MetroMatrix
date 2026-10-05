// ============================================================================
// Home-services analytics for a period: bookings per Pakistan day (a chart,
// not a list of 90 rows), by category and status, paid booking value, job
// length, cancellations, and the busiest providers — each opens that
// provider's details and analytics. Anything the server could not measure
// (no completed jobs yet) shows as "—".
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, BarList, KpiGrid, KpiTile, PermissionGate, QueryState, Section, TrendChart } from '../../../../components/admin';
import { SegmentedControl } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { useGetHSAnalyticsQuery } from '../../../../networks/admin/homeServicesApi';
import { formatCount, formatPercent } from '../../../../utils/admin/format';
import { S } from '../../../../theme';
import { openProvider } from '../../people/openProvider';
import { fillDays } from '../days';
import { categoryLabel } from '../labels';

type RangeKey = '7d' | '30d' | '90d';
const RANGES: { value: RangeKey; label: string; days: number }[] = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
];
const DAYS = Object.fromEntries(RANGES.map((r) => [r.value, r.days])) as Record<RangeKey, number>;
const DAY_MS = 86_400_000;

export default function AdminHomeServiceAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [range, setRange] = useState<RangeKey>('30d');
  const window = useMemo(() => {
    const days = DAYS[range];
    const to = new Date();
    return { from: new Date(to.getTime() - days * DAY_MS).toISOString(), to: to.toISOString() };
  }, [range]);
  const analytics = useGetHSAnalyticsQuery(window);
  const a = analytics.data;
  const caption = `Last ${RANGES.find((r) => r.value === range)?.label}`;
  const totalBookings = a ? a.byStatus.reduce((sum, x) => sum + x.count, 0) : null;
  const perDay = useMemo(() => (a ? fillDays(a.bookingsOverTime, DAYS[range]) : []), [a, range]);

  return (
    <AdminScreen title="Home-services analytics" refreshing={analytics.isFetching && !analytics.isLoading} onRefresh={analytics.refetch}>
      <PermissionGate all={['canManageHomeServices']} action="see home-services analytics">
        <SegmentedControl options={RANGES} value={range} onChange={setRange} style={{ marginBottom: S.lg }} />
        <QueryState isLoading={analytics.isLoading} error={analytics.error} onRetry={analytics.refetch} skeleton="tiles" skeletonCount={4}>
          {a && (
            <>
              <Section title="Summary" caption={caption}>
                <KpiGrid>
                  <KpiTile label="Bookings" icon="calendar-outline" value={formatCount(totalBookings)} onPress={() => navigation.navigate('AdminHSBookings')} />
                  <KpiTile label="Paid booking value" icon="cash-outline" value={formatMoney(a.revenue)} />
                  <KpiTile
                    label="Cancelled or rejected"
                    icon="close-circle-outline"
                    value={formatPercent(a.cancellationRate)}
                    tone={a.cancellationRate !== null && a.cancellationRate >= 25 ? 'warning' : 'neutral'}
                  />
                  <KpiTile
                    label="Average job length"
                    icon="stopwatch-outline"
                    value={a.averageCompletionMinutes === null ? '—' : `${formatCount(a.averageCompletionMinutes)} min`}
                    caption="Completed jobs"
                  />
                </KpiGrid>
              </Section>

              <Section title="Bookings per day" caption={`${caption}, Pakistan time`} card>
                <TrendChart data={perDay} unit="bookings" format={formatCount} />
              </Section>

              <Section title="Busiest providers" caption={`${caption}, completed jobs`} card>
                <BarList
                  maxRows={5}
                  items={a.topProviders.map((p) => ({
                    key: p.id,
                    label: p.name,
                    value: p.jobs,
                    display: `${formatCount(p.jobs)} jobs`,
                    detail: `${formatMoney(p.gross)}${p.rating === null ? '' : ` · ${p.rating.toFixed(1)} ★`}`,
                    onPress: () => openProvider(navigation, p.id),
                  }))}
                  emptyText="No completed jobs in this period."
                />
              </Section>

              <Section title="By category" caption={caption} card>
                <BarList
                  maxRows={6}
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
            </>
          )}
        </QueryState>
      </PermissionGate>
    </AdminScreen>
  );
}
