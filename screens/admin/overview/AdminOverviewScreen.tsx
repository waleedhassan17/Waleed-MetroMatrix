// ============================================================================
// Overview — what needs an admin now, and how the platform is doing.
//
// GET /admin/overview, filtered by the server to this admin's permissions:
//   - a summary strip: how much is waiting and for how long
//   - the queues, each with its own icon and how long the oldest item has
//     waited (a day reads as a warning, three days as overdue)
//   - platform figures with their periods and month-on-month trend chips
//   - one block per module with a shortcut into it (a module that fails to
//     answer says so instead of taking the screen down)
//   - the five most recent admin actions
//
// And charts, over one range the admin picks (7, 30 or 90 days):
//   - customers and providers — every provider type on its own card
//     (RegistrationCharts, with the analytics permission)
//   - each module's activity under its tiles (ServiceCharts)
// Each chart block loads and fails on its own; pulling to refresh moves the
// range up to now and reloads everything.
//
// Replaces the 2,250-line dashboard, which showed a greeting card, gradient
// tiles, a donut whose split was invented when the API had none (40 % / 35 %
// / 25 % of the total), a hardcoded "+5.2%" trend and `|| 12` fallbacks, and
// read endpoints the backend no longer serves.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, EntityRow, KpiGrid, KpiTile, PermissionGate, QueryState, Section, StatusTimeline } from '../../../components/admin';
import { EmptyState, ErrorState, SegmentedControl } from '../../../components/ui';
import { usePermission } from '../../../hooks/useAdminPermission';
import { useGetOverviewQuery } from '../../../networks/admin/adminApi';
import { formatAgo, formatCount, formatDate } from '../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../theme';
import { queueIcon, waitTone } from '../queue/queueLook';
import { DASHBOARD_RANGES, rangeLabel, rangeWindow, type DashboardRange, type RangeWindow } from './dashboardRange';
import { higherIsBetter, metricCaption, metricDelta, metricIcon, metricTone, metricValue, type Metric } from './metrics';
import RegistrationCharts from './RegistrationCharts';
import { HealthcareCharts, HomeServicesCharts, ShoppingCharts } from './ServiceCharts';

type Vertical = { label: string; status: 'ok' | 'unavailable'; headline: Metric[] };
type Activity = { id: string; action: string; actor?: { id?: string; name?: string } | null; reason?: string | null; createdAt: string };

/** Where each module's shortcut goes. */
const MODULE_ROUTES: Record<string, { route: string; label: string }> = {
  homeservice: { route: 'AdminHSAnalytics', label: 'Open' },
  healthcare: { route: 'AdminHealthcareDashboard', label: 'Open' },
  shopping: { route: 'AdminShopping', label: 'Open' },
};

/** Each module's charts, shown under its tiles. */
const MODULE_CHARTS: Record<string, React.ComponentType<{ window: RangeWindow; caption: string }>> = {
  homeservice: HomeServicesCharts,
  healthcare: HealthcareCharts,
  shopping: ShoppingCharts,
};

const RECENT_ACTIVITY = 5;
const DAYS = Object.fromEntries(DASHBOARD_RANGES.map((r) => [r.value, r.days])) as Record<DashboardRange, number>;

export default function AdminOverviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const overview = useGetOverviewQuery(undefined, { refetchOnMountOrArgChange: 30 });
  const data = overview.data;
  const canAnalytics = usePermission('canViewAnalytics');

  // The charts' window is fixed while the screen is open, so their requests
  // stay put; pulling to refresh moves it up to now, which reloads them all.
  const [range, setRange] = useState<DashboardRange>('30d');
  const [now, setNow] = useState(() => new Date());
  const window = useMemo(() => rangeWindow(DAYS[range], now), [range, now]);
  const caption = rangeLabel(range);
  const refresh = () => {
    setNow(new Date());
    overview.refetch();
  };

  const queues = (data?.queues ?? []).filter((q) => q.count === null || q.count > 0);
  const verticals = Object.entries((data?.verticals ?? {}) as Record<string, Vertical>);
  const activity = ((data?.recentActivity ?? []) as Activity[]).slice(0, RECENT_ACTIVITY);

  // A queue that could not be counted adds nothing here and says so in its own row.
  const waiting = queues.reduce((n, q) => (typeof q.count === 'number' ? n + q.count : n), 0);
  const oldest = queues
    .map((q) => q.oldestAt)
    .filter((d): d is string => !!d)
    .sort()[0];
  const oldestTone = waitTone(oldest);
  const hasCharts = canAnalytics || verticals.some(([key, v]) => !!MODULE_CHARTS[key] && v.status !== 'unavailable');

  const tile = (m: Metric) => (
    <KpiTile
      key={m.key}
      label={m.label}
      value={metricValue(m)}
      caption={metricCaption(m)}
      tone={metricTone(m)}
      icon={metricIcon(m)}
      delta={metricDelta(m)}
      higherIsBetter={higherIsBetter(m)}
    />
  );

  return (
    <AdminScreen
      title="Overview"
      subtitle={data ? `Updated ${formatAgo(data.generatedAt)}` : undefined}
      hideBack
      refreshing={overview.isFetching && !overview.isLoading}
      onRefresh={refresh}
      summary={
        data ? (
          <View style={styles.strip} accessible accessibilityRole="summary">
            <Text style={styles.stripMain}>{waiting ? `${formatCount(waiting)} waiting for a decision` : 'Nothing waiting'}</Text>
            <Text style={[styles.stripSide, oldestTone === 'error' && styles.stripError, oldestTone === 'warning' && styles.stripWarning]}>
              {oldest ? `Oldest added ${formatAgo(oldest)}` : formatDate(data.generatedAt)}
            </Text>
          </View>
        ) : undefined
      }
    >
      <QueryState isLoading={overview.isLoading} error={overview.error} onRetry={overview.refetch} skeleton="tiles" skeletonCount={4}>
        <Section title="Needs attention" count={queues.length || null} onSeeAll={queues.length ? () => navigation.navigate('Queue') : undefined}>
          {queues.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title="All clear" message="Nothing is waiting for you." />
          ) : (
            <View>
              {queues.map((q, i) => {
                const tone = waitTone(q.oldestAt);
                const unavailable = q.status === 'unavailable' || q.count === null;
                return (
                  <EntityRow
                    key={q.type}
                    icon={queueIcon(q.type)}
                    iconTone={unavailable ? 'neutral' : tone ?? 'accent'}
                    title={q.label}
                    subtitle={unavailable ? "Couldn't check just now" : q.oldestAt ? `Oldest added ${formatAgo(q.oldestAt)}${tone === 'error' ? ' · overdue' : ''}` : undefined}
                    badge={q.count === null ? null : { label: formatCount(q.count), tone: tone ?? 'warning' }}
                    urgency={tone}
                    onPress={q.type === 'reconciliation_drift' ? undefined : () => navigation.navigate('Queue', { type: q.type })}
                    divider={i < queues.length - 1}
                  />
                );
              })}
            </View>
          )}
        </Section>

        <Section title="Platform">
          <KpiGrid>{(data?.kpis ?? []).map(tile)}</KpiGrid>
        </Section>

        {hasCharts && (
          <Section title="Charts" caption="The range for every chart below, Pakistan time">
            <SegmentedControl options={DASHBOARD_RANGES} value={range} onChange={setRange} />
          </Section>
        )}

        <PermissionGate all={['canViewAnalytics']} fallback={null}>
          <RegistrationCharts window={window} caption={caption} />
        </PermissionGate>

        {verticals.map(([key, v]) => {
          const shortcut = MODULE_ROUTES[key];
          const Charts = MODULE_CHARTS[key];
          return (
            <Section
              key={key}
              title={v.label}
              onSeeAll={shortcut && v.status !== 'unavailable' ? () => navigation.navigate(shortcut.route) : undefined}
              seeAllLabel={shortcut?.label}
            >
              {v.status === 'unavailable' ? (
                <ErrorState title={`${v.label} didn't answer`} message="The rest of the overview is up to date. Pull to refresh to try again." />
              ) : (
                <>
                  <KpiGrid>{v.headline.map(tile)}</KpiGrid>
                  {!!Charts && <Charts window={window} caption={caption} />}
                </>
              )}
            </Section>
          );
        })}

        <Section title="Recent admin activity" caption={activity.length ? `Last ${activity.length}` : undefined} card>
          <View style={styles.timeline}>
            <StatusTimeline entries={activity.map((a) => ({ id: a.id, action: a.action, actor: a.actor ?? undefined, reason: a.reason, createdAt: a.createdAt }))} />
          </View>
        </Section>
      </QueryState>
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    strip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
    stripMain: { ...T.bodyStrong, color: c.ink, flexShrink: 1 },
    stripSide: { ...T.caption, color: c.inkMuted },
    stripWarning: { color: c.warning },
    stripError: { color: c.error },
    timeline: { paddingTop: S.md },
  });
