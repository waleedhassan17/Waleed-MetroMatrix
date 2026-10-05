// ============================================================================
// A provider's analytics: what they did and what they were paid over a range
// (30 days, 90 days, 12 months). The same panel serves a home-service
// provider, a doctor and a vendor — the server sends one shape with figures,
// a day/month series, breakdowns and recent work. Money is what the provider
// was paid; there is no platform commission.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BarList, DetailRow, EntityRow, KpiGrid, KpiTile, QueryState, Section, TrendChart } from '../../../../components/admin';
import { EmptyState, SegmentedControl } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { presentStatus, useAdminMeta, type EnumGroup } from '../../../../hooks/useAdminMeta';
import { useGetProviderAnalyticsQuery, type AnalyticsRange, type ProviderAnalytics } from '../../../../networks/admin/adminApi';
import { formatCount, formatDate } from '../../../../utils/admin/format';
import { S } from '../../../../theme';
import { higherIsBetter, metricCaption, metricDelta, metricIcon, metricTone, metricValue } from '../../overview/metrics';
import { routeForActivity } from '../openProvider';

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
];

const KIND: Record<string, { icon: string; group: EnumGroup }> = {
  booking: { icon: 'construct-outline', group: 'bookingStatuses' },
  appointment: { icon: 'medkit-outline', group: 'appointmentStatuses' },
  order: { icon: 'bag-handle-outline', group: 'orderStatuses' },
};

type Measure = 'count' | 'amount';

export default function ProviderAnalyticsPanel({ providerId }: { providerId: string }) {
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [measure, setMeasure] = useState<Measure>('count');
  const query = useGetProviderAnalyticsQuery({ id: providerId, range });
  const a = query.data as ProviderAnalytics | undefined;

  const series = useMemo(() => (a?.series ?? []).map((p) => ({ date: p.date, value: measure === 'count' ? p.count : p.amount })), [a, measure]);
  const statusGroup = a?.type === 'doctor' ? 'appointmentStatuses' : a?.type === 'vendor' ? 'orderStatuses' : 'bookingStatuses';

  return (
    <View>
      <SegmentedControl options={RANGES} value={range} onChange={setRange} style={styles.range} />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} skeleton="tiles" skeletonCount={4} action="see this provider's analytics">
        {a && (
          <>
            {a.summary.length > 0 ? (
              <Section title="Summary" caption={a.rangeLabel}>
                <KpiGrid>
                  {a.summary.map((m) => (
                    <KpiTile
                      key={m.key}
                      label={m.label}
                      value={metricValue(m)}
                      caption={metricCaption(m, a.rangeLabel)}
                      icon={metricIcon(m)}
                      delta={metricDelta(m)}
                      higherIsBetter={higherIsBetter(m)}
                      tone={metricTone(m)}
                    />
                  ))}
                </KpiGrid>
              </Section>
            ) : (
              <EmptyState
                icon="analytics-outline"
                title="Nothing to measure yet"
                message={
                  a.type === 'doctor'
                    ? 'This doctor has no doctor profile on record yet.'
                    : a.type === 'vendor'
                      ? 'This vendor does not own a brand yet.'
                      : 'This account has not finished signing up.'
                }
                style={styles.empty}
              />
            )}

            <Section title={a.bucket === 'month' ? 'By month' : 'By day'} card>
              <View style={styles.chartBox}>
                <SegmentedControl
                  options={[
                    { value: 'count', label: a.seriesLabels.count },
                    { value: 'amount', label: a.seriesLabels.amount },
                  ]}
                  value={measure}
                  onChange={setMeasure}
                  style={styles.measure}
                />
                <TrendChart
                  data={series}
                  unit={measure === 'count' ? a.seriesLabels.count.toLowerCase() : `${a.seriesLabels.amount.toLowerCase()}`}
                  format={measure === 'count' ? formatCount : (n) => formatMoney(n)}
                />
              </View>
            </Section>

            {a.breakdowns
              .filter((b) => b.rows.length > 0)
              .map((b) => (
                <Section key={b.key} title={b.label} card>
                  <BarList
                    maxRows={5}
                    items={b.rows.map((r) => ({
                      key: r.key,
                      label: b.key === 'status' ? presentStatus(meta, statusGroup, r.key).label : r.label,
                      value: r.value,
                      display: b.unit ? formatMoney(r.value) : formatCount(r.value),
                    }))}
                  />
                </Section>
              ))}

            <Section title="Recent" count={a.recent.length || null} card={a.recent.length > 0} caption={a.recent.length ? undefined : 'No activity yet.'}>
              {a.recent.map((r, i) => {
                const look = KIND[r.kind] ?? KIND.booking;
                const status = presentStatus(meta, look.group, r.status);
                const route = routeForActivity(r.kind, r.id);
                return (
                  <EntityRow
                    key={r.id}
                    title={r.title}
                    subtitle={[r.subtitle, formatDate(r.at)].filter(Boolean).join(' · ')}
                    icon={look.icon}
                    badge={status}
                    meta={r.amount === null || r.amount === undefined ? null : formatMoney(r.amount)}
                    onPress={route ? () => navigation.navigate(route.name, route.params) : undefined}
                    divider={i < a.recent.length - 1}
                  />
                );
              })}
            </Section>

            <Section title="Wallet" card>
              <DetailRow label="Balance" value={formatMoney(a.wallet.balance)} />
              <DetailRow label="Earned through the wallet" value={formatMoney(a.wallet.lifetimeEarnings)} />
              <DetailRow
                label="Payouts waiting"
                value={a.wallet.pendingPayouts.count ? `${formatCount(a.wallet.pendingPayouts.count)} · ${formatMoney(a.wallet.pendingPayouts.amount)}` : 'None'}
                last
              />
            </Section>
          </>
        )}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  range: { marginBottom: S.lg },
  chartBox: { paddingVertical: S.md },
  measure: { marginBottom: S.md },
  empty: { marginBottom: S.lg },
});
