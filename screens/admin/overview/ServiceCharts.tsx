// ============================================================================
// Each service's activity, under its headline tiles on the home screen: what
// happened per day, how it splits, and who or what led — from the same
// endpoints as that service's own analytics screen, over the home screen's
// range. Each card loads, fails and retries on its own, so one service that
// does not answer never takes the others down.
// ============================================================================

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BarList, DonutChart, PermissionGate, QueryState, seriesColor, SplitBar, TrendChart } from '../../../components/admin';
import { Card } from '../../../components/ui';
import { formatMoney } from '../../../constants/Currency';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { useGetAppointmentTimelineQuery, useGetRevenueBreakdownQuery } from '../../../networks/admin/healthcareAnalyticsApi';
import { useGetHSAnalyticsQuery } from '../../../networks/admin/homeServicesApi';
import { useGetShopAnalyticsQuery } from '../../../networks/admin/shoppingApi';
import { formatCount } from '../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../theme';
import { categoryLabel } from '../homeservice/labels';
import { openProvider } from '../people/openProvider';
import {
  appointmentsPerDay,
  completionSegments,
  consultationTypeSegments,
  counted,
  deliveredOrdersPerDay,
  deliveredValuePerDay,
  fillByDay,
  statusItems,
} from './dashboardData';
import { windowDays, type RangeWindow } from './dashboardRange';

interface Props {
  window: RangeWindow;
  /** "Last 30 days". */
  caption: string;
}

function useChartStyles() {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors]);
}

function ChartHeading({ title, caption, styles }: { title: string; caption?: string; styles: Styles }) {
  return (
    <>
      <Text style={styles.chartTitle}>{title}</Text>
      {!!caption && <Text style={styles.chartCaption}>{caption}</Text>}
    </>
  );
}

// ── Home services ───────────────────────────────────────────────────────────

export function HomeServicesCharts({ window, caption }: Props) {
  const styles = useChartStyles();
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const analytics = useGetHSAnalyticsQuery({ from: window.from, to: window.to });
  const a = analytics.data;
  const days = useMemo(() => windowDays(window), [window]);

  return (
    <Card style={styles.card}>
      <QueryState isLoading={analytics.isLoading} error={analytics.error} onRetry={analytics.refetch} skeletonCount={1} action="see home-services activity">
        {a && (
          <>
            <ChartHeading title="Bookings per day" caption={`${caption}, Pakistan time`} styles={styles} />
            <TrendChart data={fillByDay(a.bookingsOverTime.map((b) => ({ date: b.date, value: b.count })), days)} unit="bookings" format={formatCount} height={136} />

            <View style={styles.divider} />
            <ChartHeading title="Bookings by status" caption={caption} styles={styles} />
            <BarList items={statusItems(meta, 'bookingStatuses', a.byStatus.map((s): [string, number] => [s.status, s.count]))} maxRows={5} emptyText="No bookings in this period." />

            <View style={styles.divider} />
            <ChartHeading title="By category" caption={caption} styles={styles} />
            <BarList
              maxRows={4}
              items={[...a.byCategory]
                .sort((x, y) => y.count - x.count)
                .map((c) => ({ key: c.category, label: categoryLabel(meta, c.category), value: c.count, display: formatCount(c.count), detail: `${formatMoney(c.gross)} booked` }))}
              emptyText="No bookings in this period."
            />

            <View style={styles.divider} />
            <ChartHeading title="Busiest providers" caption={`${caption}, completed jobs`} styles={styles} />
            <BarList
              maxRows={3}
              items={a.topProviders.map((p) => ({
                key: p.id,
                label: p.name,
                value: p.jobs,
                display: counted(p.jobs, 'job'),
                detail: `${formatMoney(p.gross)}${p.rating === null ? '' : ` · ${p.rating.toFixed(1)} ★`}`,
                onPress: () => openProvider(navigation, p.id),
              }))}
              emptyText="No completed jobs in this period."
            />
          </>
        )}
      </QueryState>
    </Card>
  );
}

// ── Healthcare ──────────────────────────────────────────────────────────────

export function HealthcareCharts(props: Props) {
  // The healthcare analytics endpoints ask for the analytics permission too.
  return (
    <PermissionGate all={['canViewAnalytics']} fallback={null}>
      <HealthcareChartsBody {...props} />
    </PermissionGate>
  );
}

function HealthcareChartsBody({ window, caption }: Props) {
  const styles = useChartStyles();
  const { colors, mode } = useTheme();
  const range = { startDate: window.fromKey, endDate: window.toKey };
  const timeline = useGetAppointmentTimelineQuery({ ...range, period: 'daily' });
  const bySpecialty = useGetRevenueBreakdownQuery({ ...range, groupBy: 'specialty' });
  const t = timeline.data?.timeline;
  const days = useMemo(() => windowDays(window), [window]);

  return (
    <Card style={styles.card}>
      <QueryState isLoading={timeline.isLoading} error={timeline.error} onRetry={timeline.refetch} skeletonCount={1} action="see healthcare activity">
        {t && (
          <>
            <ChartHeading title="Appointments per day" caption={`${caption}, by appointment date`} styles={styles} />
            <TrendChart data={appointmentsPerDay(t, days)} unit="appointments" format={formatCount} height={136} />

            <View style={styles.divider} />
            <ChartHeading title="In clinic or by video" caption={caption} styles={styles} />
            <DonutChart segments={consultationTypeSegments(t, (i) => seriesColor(i, mode))} caption="appointments" />

            <View style={styles.divider} />
            <ChartHeading title="Completed" caption="Of the appointments booked for these days" styles={styles} />
            <SplitBar segments={completionSegments(t, { done: colors.success, rest: colors.inkFaint })} emptyText="No appointments in this period." />
          </>
        )}
      </QueryState>

      <View style={styles.divider} />
      <ChartHeading title="Payments by specialty" caption={`${caption}, completed consultations`} styles={styles} />
      <QueryState isLoading={bySpecialty.isLoading} error={bySpecialty.error} onRetry={bySpecialty.refetch} skeletonCount={1} skeleton="rows">
        <BarList
          maxRows={5}
          items={(bySpecialty.data ?? []).map((r, i) => ({
            key: r.specialtyId ?? `unassigned-${i}`,
            label: r.specialtyName || 'No specialty',
            value: r.totalRevenue,
            display: formatMoney(r.totalRevenue),
            detail: counted(r.appointmentCount, 'consultation'),
          }))}
          emptyText="No completed consultations in this period."
        />
      </QueryState>
    </Card>
  );
}

// ── Shopping ────────────────────────────────────────────────────────────────

export function ShoppingCharts({ window, caption }: Props) {
  const styles = useChartStyles();
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const analytics = useGetShopAnalyticsQuery({ from: window.from, to: window.to });
  const a = analytics.data;
  const days = useMemo(() => windowDays(window), [window]);

  return (
    <Card style={styles.card}>
      <QueryState isLoading={analytics.isLoading} error={analytics.error} onRetry={analytics.refetch} skeletonCount={1} action="see shopping activity">
        {a && (
          <>
            <ChartHeading title="Delivered orders per day" caption={`${caption}, by the day they were placed`} styles={styles} />
            <TrendChart data={deliveredOrdersPerDay(a.gmvSeries, days)} unit="delivered orders" format={formatCount} height={136} />

            <View style={styles.divider} />
            <ChartHeading title="Delivered order value per day" caption={caption} styles={styles} />
            <TrendChart data={deliveredValuePerDay(a.gmvSeries, days)} kind="line" unit="PKR" format={formatMoney} height={136} />

            <View style={styles.divider} />
            <ChartHeading title="Orders by status" caption={`${caption}, every order placed`} styles={styles} />
            <BarList items={statusItems(meta, 'orderStatuses', Object.entries(a.ordersByStatus))} maxRows={5} emptyText="No orders in this period." />

            <View style={styles.divider} />
            <ChartHeading title="Sales by brand" caption={`${caption}, delivered orders`} styles={styles} />
            <BarList
              maxRows={5}
              items={a.revenueByBrand.map((b) => ({
                key: b.brandId,
                label: b.brandName,
                value: b.revenue,
                display: formatMoney(b.revenue),
                detail: counted(b.orders, 'order'),
                onPress: b.ownerId ? () => openProvider(navigation, b.ownerId) : undefined,
              }))}
              emptyText="No delivered orders in this period."
            />
          </>
        )}
      </QueryState>
    </Card>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { marginTop: S.md },
    chartTitle: { ...T.bodyStrong, color: c.ink },
    chartCaption: { ...T.caption, color: c.inkMuted, marginBottom: S.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: S.lg },
  });
