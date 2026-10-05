// ============================================================================
// Overview — what needs an admin now, and how the platform is doing.
//
// One request (GET /admin/overview), filtered by the server to this admin's
// permissions: queues with how long the oldest item has waited, platform
// figures with their periods and month-on-month change, one row per module
// (a module that fails to answer says so instead of taking the screen down),
// and recent admin activity.
//
// Replaces the 2,250-line dashboard, which showed a greeting card, gradient
// tiles, a donut whose split was invented when the API had none (40 % / 35 %
// / 25 % of the total), a hardcoded "+5.2%" trend and `|| 12` fallbacks, and
// read endpoints the backend no longer serves.
// ============================================================================

import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, EntityRow, KpiGrid, KpiTile, QueryState, Section, StatusTimeline } from '../../../components/admin';
import { EmptyState, ErrorState } from '../../../components/ui';
import { useGetOverviewQuery } from '../../../networks/admin/adminApi';
import { formatAgo, formatCount } from '../../../utils/admin/format';
import { S } from '../../../theme';
import { higherIsBetter, metricCaption, metricDelta, metricIcon, metricTone, metricValue, type Metric } from './metrics';

type Vertical = { label: string; status: 'ok' | 'unavailable'; headline: Metric[] };
type Activity = { id: string; action: string; actor?: { id?: string; name?: string } | null; reason?: string | null; createdAt: string };

export default function AdminOverviewScreen() {
  const navigation = useNavigation<any>();
  const overview = useGetOverviewQuery(undefined, { refetchOnMountOrArgChange: 30 });
  const data = overview.data;

  const queues = (data?.queues ?? []).filter((q) => q.count === null || q.count > 0);
  const verticals = Object.entries((data?.verticals ?? {}) as Record<string, Vertical>);
  const activity = (data?.recentActivity ?? []) as Activity[];

  return (
    <AdminScreen
      title="Overview"
      subtitle={data ? `Updated ${formatAgo(data.generatedAt)}` : undefined}
      hideBack
      refreshing={overview.isFetching && !overview.isLoading}
      onRefresh={overview.refetch}
    >
      <QueryState isLoading={overview.isLoading} error={overview.error} onRetry={overview.refetch} skeletonCount={4}>
        <Section title="Needs attention">
          {queues.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title="All clear" message="Nothing is waiting for you." />
          ) : (
            <View>
              {queues.map((q, i) => (
                <EntityRow
                  key={q.type}
                  icon="file-tray-full-outline"
                  title={q.label}
                  subtitle={
                    q.status === 'unavailable' || q.count === null
                      ? "Couldn't check just now"
                      : q.oldestAt
                        ? `Oldest waiting since ${formatAgo(q.oldestAt)}`
                        : undefined
                  }
                  meta={q.count === null ? '—' : formatCount(q.count)}
                  badge={q.count ? { label: 'Waiting', tone: 'warning' } : null}
                  onPress={q.type === 'reconciliation_drift' ? undefined : () => navigation.navigate('Queue', { type: q.type })}
                  divider={i < queues.length - 1}
                />
              ))}
            </View>
          )}
        </Section>

        <Section title="Platform">
          <KpiGrid>
            {(data?.kpis ?? []).map((m) => (
              <KpiTile key={m.key} label={m.label} value={metricValue(m)} caption={metricCaption(m)} tone={metricTone(m)} icon={metricIcon(m)} delta={metricDelta(m)} higherIsBetter={higherIsBetter(m)} />
            ))}
          </KpiGrid>
        </Section>

        {verticals.map(([key, v]) => (
          <Section key={key} title={v.label}>
            {v.status === 'unavailable' ? (
              <ErrorState title={`${v.label} didn't answer`} message="The rest of the overview is up to date. Pull to refresh to try again." />
            ) : (
              <KpiGrid>
                {v.headline.map((m) => (
                  <KpiTile key={m.key} label={m.label} value={metricValue(m)} caption={metricCaption(m)} tone={metricTone(m)} icon={metricIcon(m)} delta={metricDelta(m)} higherIsBetter={higherIsBetter(m)} />
                ))}
              </KpiGrid>
            )}
          </Section>
        ))}

        <Section title="Recent admin activity" card>
          <View style={{ paddingTop: S.md }}>
            <StatusTimeline entries={activity.map((a) => ({ id: a.id, action: a.action, actor: a.actor ?? undefined, reason: a.reason, createdAt: a.createdAt }))} />
          </View>
        </Section>
      </QueryState>
    </AdminScreen>
  );
}
