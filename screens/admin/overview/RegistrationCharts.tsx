// ============================================================================
// Who has joined: customers, and providers — all of them by type, then each
// type on its own card with its states, its sign-ups per day and what it is
// made of (doctors by specialty, home service by trade, vendors by category).
//
// One request (GET /admin/analytics, canViewAnalytics); an admin without that
// permission sees the overview without these charts.
// ============================================================================

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BarList, DonutChart, providerTypeColor, QueryState, Section, SplitBar, toneColor, TrendChart } from '../../../components/admin';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { usePermission } from '../../../hooks/useAdminPermission';
import { useGetRegistrationsQuery, type ConsoleMeta, type ProviderTypeRegistrations } from '../../../networks/admin/adminApi';
import { formatCount } from '../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../theme';
import { breakdownItems, dailyPoints, PROVIDER_TYPE_TITLE, providerTypeSegments, runningTotal, stateSegments } from './dashboardData';
import type { RangeWindow } from './dashboardRange';

const BREAKDOWN_TITLE: Record<string, string> = {
  specialty: 'By specialty',
  providerSubType: 'By trade',
  category: 'By category',
};

interface Props {
  window: RangeWindow;
  /** "Last 30 days". */
  caption: string;
}

export default function RegistrationCharts({ window, caption }: Props) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: meta } = useAdminMeta();
  const registrations = useGetRegistrationsQuery({ from: window.fromKey, to: window.toKey });
  const d = registrations.data;

  const customersTotal = useMemo(() => (d ? runningTotal(d.users.before, d.users.daily) : []), [d]);
  const typeSegments = useMemo(() => (d ? providerTypeSegments(d.providers.types, (t) => providerTypeColor(t, mode, colors)) : []), [d, mode, colors]);
  const state = { isLoading: registrations.isLoading, error: registrations.error, onRetry: registrations.refetch };

  return (
    <>
      <Section title="Customers" caption={caption} card>
        <QueryState {...state} skeletonCount={1} action="see registrations">
          {d && (
            <>
              <Text style={styles.chartTitle}>Registered customers</Text>
              <Text style={styles.chartCaption}>Everyone with an account, at the end of each day</Text>
              <TrendChart data={customersTotal} kind="line" unit="customers registered" format={formatCount} aggregate="last" />
              <View style={styles.divider} />
              <Text style={styles.chartTitle}>New customers per day</Text>
              <Text style={styles.chartCaption}>{`${formatCount(d.users.registered)} joined · ${formatCount(d.users.stillActive)} still active`}</Text>
              <TrendChart data={dailyPoints(d.users.daily)} unit="new customers" format={formatCount} height={128} />
            </>
          )}
        </QueryState>
      </Section>

      <Section title="Providers" caption="Everyone registered, by type" card>
        <QueryState {...state} skeletonCount={1}>
          {d && (
            <>
              <DonutChart segments={typeSegments} caption="providers" />
              <View style={styles.divider} />
              <Text style={styles.chartTitle}>New providers per day</Text>
              <Text style={styles.chartCaption}>{`${caption} · ${formatCount(d.providers.registered)} joined`}</Text>
              <TrendChart data={dailyPoints(d.providers.daily)} unit="new providers" format={formatCount} height={128} />
            </>
          )}
        </QueryState>
      </Section>

      {d?.providers.types
        .filter((t) => t.type !== 'pending')
        .map((t) => (
          <ProviderTypeCard key={t.type} entry={t} meta={meta} caption={caption} color={providerTypeColor(t.type, mode, colors)} styles={styles} />
        ))}
    </>
  );
}

function ProviderTypeCard({
  entry,
  meta,
  caption,
  color,
  styles,
}: {
  entry: ProviderTypeRegistrations;
  meta: ConsoleMeta | undefined;
  caption: string;
  color: string;
  styles: Styles;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const canOpen = usePermission('canApproveProviders');
  const title = PROVIDER_TYPE_TITLE[entry.type];
  const breakdown = breakdownItems(meta, entry.breakdown);

  return (
    <Section
      title={title}
      card
      onSeeAll={canOpen ? () => navigation.navigate('People', { segment: 'providers' }) : undefined}
      seeAllLabel="See all"
    >
      {/* The dot ties this card to its slice of the providers ring above. */}
      <View style={styles.head} accessible accessibilityLabel={`${formatCount(entry.total)} ${title.toLowerCase()} registered, ${formatCount(entry.registered)} new, ${caption.toLowerCase()}`}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.total}>{formatCount(entry.total)}</Text>
        <Text style={styles.totalLabel}>registered</Text>
        <Text style={styles.fresh}>{`${formatCount(entry.registered)} new, ${caption.toLowerCase()}`}</Text>
      </View>

      <Text style={styles.chartTitle}>By state</Text>
      <View style={styles.block}>
        <SplitBar segments={stateSegments(meta, entry.byState, (tone) => toneColor(tone, colors))} emptyText="Nobody yet." />
      </View>

      <View style={styles.divider} />
      <Text style={styles.chartTitle}>New sign-ups per day</Text>
      <Text style={styles.chartCaption}>{caption}</Text>
      <TrendChart data={dailyPoints(entry.daily)} unit={`new ${title.toLowerCase()}`} format={formatCount} height={112} />

      {!!entry.breakdown && (
        <>
          <View style={styles.divider} />
          <Text style={styles.chartTitle}>{BREAKDOWN_TITLE[entry.breakdown.field] ?? 'Made up of'}</Text>
          <Text style={styles.chartCaption}>Everyone registered</Text>
          <BarList items={breakdown} maxRows={5} emptyText="Nobody yet." />
        </>
      )}
    </Section>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    chartTitle: { ...T.bodyStrong, color: c.ink, marginTop: S.xs },
    chartCaption: { ...T.caption, color: c.inkMuted, marginBottom: S.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: S.lg },
    block: { marginTop: S.sm },
    head: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md },
    dot: { width: 10, height: 10, borderRadius: 5, alignSelf: 'center' },
    total: { ...T.heading, color: c.ink, fontVariant: ['tabular-nums'] },
    totalLabel: { ...T.body, color: c.inkMuted },
    fresh: { ...T.caption, color: c.inkMuted, marginLeft: 'auto' },
  });
