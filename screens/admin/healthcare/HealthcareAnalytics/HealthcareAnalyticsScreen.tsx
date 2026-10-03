// ============================================================================
// Healthcare analytics — only what the server measures.
//
// This screen used to start from a hardcoded set of figures (12,458
// appointments, named "top doctors" with ratings, six months of revenue, a
// satisfaction breakdown) and overlay whatever the API returned on top, so a
// failed request or an empty database still showed a busy, convincing
// dashboard. Four of its sections had no backend source at all, and its
// Export button waited 1.2 s and reported success without exporting anything.
//
// Now every figure comes from GET /api/v1/admin/analytics/{stats,appointments,
// revenue}. Missing is "—", a failure is an error with a retry, and sections
// with no data source are gone.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, BarList, KpiGrid, KpiTile, QueryState, Section } from '../../../../components/admin';
import { SegmentedControl } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import {
  monthLabel,
  rangeFor,
  useGetAppointmentTimelineQuery,
  useGetHealthcareStatsQuery,
  useGetRevenueBreakdownQuery,
  type RangeKey,
} from '../../../../networks/admin/healthcareAnalyticsApi';
import { formatCount, formatDelta, formatPercent } from '../../../../utils/admin/format';
import { R, S, T, useTheme, type ThemeColors } from '../../../../theme';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];

const TYPE_LABEL: Record<string, string> = { video: 'video', 'in-clinic': 'in clinic' };

export default function HealthcareAnalyticsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const stats = useGetHealthcareStatsQuery();
  const timeline = useGetAppointmentTimelineQuery(range);
  const bySpecialty = useGetRevenueBreakdownQuery({ ...range, groupBy: 'specialty' });
  const byDoctor = useGetRevenueBreakdownQuery({ ...range, groupBy: 'doctor' });

  const refreshing = stats.isFetching || timeline.isFetching || bySpecialty.isFetching || byDoctor.isFetching;
  const refresh = () => {
    stats.refetch();
    timeline.refetch();
    bySpecialty.refetch();
    byDoctor.refetch();
  };

  const s = stats.data;
  const rangeCaption = RANGES.find((r) => r.value === rangeKey)?.label;

  return (
    <AdminScreen title="Healthcare analytics" refreshing={refreshing && !stats.isLoading} onRefresh={refresh}>
      <Section title="Doctors and appointments" caption="All time">
        <QueryState isLoading={stats.isLoading} error={stats.error} onRetry={stats.refetch} skeletonCount={1} action="see healthcare analytics">
          <KpiGrid>
            <KpiTile label="Doctors" value={formatCount(s?.totalDoctors)} />
            <KpiTile label="Verified" value={formatCount(s?.verifiedDoctors)} />
            <KpiTile
              label="Awaiting verification"
              value={formatCount(s?.pendingVerification)}
              tone={s?.pendingVerification ? 'warning' : 'neutral'}
              onPress={() => navigation.navigate('DoctorManagement')}
            />
            <KpiTile label="Appointments" value={formatCount(s?.totalAppointments)} />
          </KpiGrid>
        </QueryState>
      </Section>

      <Section title="Consultation revenue" caption="Completed consultations, Pakistan time">
        <QueryState isLoading={stats.isLoading} error={stats.error} onRetry={stats.refetch} skeletonCount={1}>
          <KpiGrid>
            <KpiTile
              label="Month to date"
              value={formatMoney(s?.thisMonthRevenue)}
              caption={s?.growth === null || s?.growth === undefined ? 'No revenue in the same period last month' : `${formatDelta(s.growth)} vs same period last month`}
            />
            <KpiTile label="Last month" value={formatMoney(s?.lastMonthRevenue)} />
          </KpiGrid>
        </QueryState>
      </Section>

      <SegmentedControl options={RANGES} value={rangeKey} onChange={setRangeKey} style={styles.range} />

      <Section title="Appointments" caption={rangeCaption}>
        <QueryState
          isLoading={timeline.isLoading}
          error={timeline.error}
          onRetry={timeline.refetch}
          isEmpty={!timeline.data?.timeline.length}
          emptyTitle="No appointments in this period"
          skeletonCount={2}
        >
          <KpiGrid style={styles.gap}>
            <KpiTile label="Completion rate" value={formatPercent(timeline.data?.overallCompletionRate)} caption="Completed ÷ booked" />
          </KpiGrid>
          <View style={styles.card}>
            {[...(timeline.data?.timeline ?? [])].reverse().map((row, i, all) => (
              <View key={row.date} style={[styles.month, i < all.length - 1 && styles.divider]}>
                <Text style={styles.monthLabel}>{monthLabel(row.date)}</Text>
                <Text style={styles.monthValue}>
                  {formatCount(row.totalAppointments)} booked · {formatCount(row.completedAppointments)} completed
                </Text>
                {row.types.length > 0 && (
                  <Text style={styles.monthDetail}>
                    {row.types.map((t) => `${formatCount(t.total)} ${TYPE_LABEL[t.type] ?? t.type}`).join(' · ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </QueryState>
      </Section>

      <Section title="Revenue by specialty" caption={rangeCaption} card>
        <QueryState isLoading={bySpecialty.isLoading} error={bySpecialty.error} onRetry={bySpecialty.refetch} skeletonCount={1}>
          <BarList
            items={(bySpecialty.data ?? []).map((r, i) => ({
              key: r.specialtyId ?? `unassigned-${i}`,
              label: r.specialtyName || 'No specialty',
              value: r.totalRevenue,
              display: formatMoney(r.totalRevenue),
              detail: `${formatCount(r.appointmentCount)} consultation${r.appointmentCount === 1 ? '' : 's'}`,
            }))}
            emptyText="No completed consultations in this period."
          />
        </QueryState>
      </Section>

      <Section title="Top doctors by revenue" caption={rangeCaption} card>
        <QueryState isLoading={byDoctor.isLoading} error={byDoctor.error} onRetry={byDoctor.refetch} skeletonCount={1}>
          <BarList
            items={(byDoctor.data ?? []).slice(0, 5).map((r, i) => ({
              key: r.doctorId ?? `doctor-${i}`,
              label: r.doctorName || 'Unnamed doctor',
              value: r.totalRevenue,
              display: formatMoney(r.totalRevenue),
              detail: `${formatCount(r.appointmentCount)} consultation${r.appointmentCount === 1 ? '' : 's'}`,
            }))}
            emptyText="No completed consultations in this period."
          />
        </QueryState>
      </Section>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    range: { marginBottom: S.lg },
    gap: { marginBottom: S.md },
    card: { borderRadius: R.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, backgroundColor: c.surface, paddingHorizontal: S.lg },
    month: { paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    monthLabel: { ...T.bodyStrong, color: c.ink },
    monthValue: { ...T.body, color: c.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
    monthDetail: { ...T.caption, color: c.inkMuted, marginTop: 2 },
  });
