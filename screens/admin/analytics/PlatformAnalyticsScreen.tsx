// ============================================================================
// Platform analytics — the analytics service, for admins.
//
//   Live         what is happening right now, refreshed every 15 s while open
//   Demand       actual demand and the forecast, per vertical and segment,
//                with the forecast's own accuracy so nobody over-trusts it
//   Leaders      who serves customers well, per vertical, last 90 days; a
//                row opens that provider's details and analytics
//   Models       the ML service's models, their honest metrics, and the
//                provider-search ranking mode
//
// Refetches hold the previous render (no skeleton flash); a source that
// cannot answer shows "—" in its own tiles while the rest still update.
// ============================================================================

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AdminScreen } from '../../../components/admin';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  StatTile,
  ToneBadge,
} from '../../../components/ui';
import { formatMoney } from '../../../constants/Currency';
import { openProvider } from '../people/openProvider';
import ForecastChart from '../../../components/ui/charts/ForecastChart';
import ModelsTab from './ModelsTab';
import { GUTTER, S, T } from '../../../constants/theme';
import { ThemeColors, useTheme } from '../../../theme';
import {
  DemandResponse,
  fetchDemand,
  fetchPerformance,
  fetchRealtimeOverview,
  methodLabel,
  RealtimeOverview,
  Vertical,
} from '../../../networks/admin/platformAnalyticsApi';

type Tab = 'live' | 'demand' | 'performance' | 'models';
const VERTICALS: { value: Vertical; label: string }[] = [
  { value: 'homeservice', label: 'Home services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'shopping', label: 'Shopping' },
];
const UNITS: Record<Vertical, string> = { homeservice: 'requests', healthcare: 'appointments', shopping: 'orders' };
const LIVE_REFRESH_MS = 15000;

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('en-PK'));
const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${Math.round(n * 100)}%`);

export default function PlatformAnalyticsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('live');

  return (
    <AdminScreen title="Platform analytics" subtitle="Live usage, demand and performance" scroll={false}>
      <View style={styles.tabs}>
        <SegmentedControl
          options={[
            { value: 'live' as Tab, label: 'Live' },
            { value: 'demand' as Tab, label: 'Demand' },
            { value: 'performance' as Tab, label: 'Leaders' },
            { value: 'models' as Tab, label: 'Models' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {tab === 'live' && <LiveTab styles={styles} />}
      {tab === 'demand' && <DemandTab styles={styles} />}
      {tab === 'performance' && <PerformanceTab styles={styles} />}
      {tab === 'models' && <ModelsTab />}
    </AdminScreen>
  );
}

function LiveTab({ styles }: { styles: Styles }) {
  const [data, setData] = useState<RealtimeOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await fetchRealtimeOverview();
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else if (!data) {
      setError(res.message || 'Could not load live data');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      timer.current = setInterval(load, LIVE_REFRESH_MS);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }, [load])
  );

  if (!data) {
    return error ? <ErrorState title="Live data unavailable" message={error} onRetry={load} /> : <View style={styles.pad}><SkeletonCard lines={4} /></View>;
  }
  const hs = data.homeservice;
  const tiles: { label: string; value: string; tone?: 'neutral' | 'accent' | 'warning' | 'success' | 'error' }[][] = [
    [
      { label: 'Providers available now', value: fmt(hs.providersAvailableNow), tone: 'accent' },
      { label: 'Waiting for a provider', value: fmt(hs.waitingForProvider), tone: typeof hs.waitingForProvider === 'number' && hs.waitingForProvider > 10 ? 'warning' : 'neutral' },
    ],
    [
      { label: 'Providers on the way', value: fmt(hs.onTheWayNow) },
      { label: 'Jobs in progress', value: fmt(hs.inProgressNow) },
    ],
    [
      { label: 'Appointments next hour', value: fmt(data.healthcare.appointmentsNextHour) },
      { label: 'Video consultations live', value: fmt(data.healthcare.videoCallsLive) },
    ],
    [
      { label: 'Orders last hour', value: fmt(data.shopping.ordersLastHour) },
      { label: 'Orders today', value: fmt(data.shopping.ordersToday) },
    ],
    [
      { label: 'People online now', value: fmt(data.online ? data.online.accounts : null) },
      { label: 'Calls in progress', value: fmt(data.online ? data.online.callsInProgress : null) },
    ],
    [
      { label: 'API requests / min', value: fmt(data.api ? data.api.requestsPerMinute : null) },
      { label: 'Server error rate', value: data.api ? pct(data.api.errorRate) : '—', tone: data.api && data.api.errorRate > 0.02 ? 'error' : 'neutral' },
    ],
  ];
  const active = data.api ? data.api.activeAccounts5m : null;

  return (
    <ScrollView contentContainerStyle={styles.pad} refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={async () => {
            setPulling(true);
            await load();
            setPulling(false);
          }}
        />
      }>
      {tiles.map((row, i) => (
        <View key={i} style={styles.tileRow}>
          {row.map((t) => (
            <StatTile key={t.label} label={t.label} value={t.value} tone={t.tone} style={styles.tile} />
          ))}
        </View>
      ))}
      {active && (
        <Text style={styles.foot}>
          Active in the last 5 minutes: {fmt(active.user)} customers · {fmt(active.provider)} providers · {fmt(active.admin)} admins
        </Text>
      )}
      <Text style={styles.foot}>Updated {new Date(data.at).toLocaleTimeString()} · refreshes every 15 seconds</Text>
    </ScrollView>
  );
}

function DemandTab({ styles }: { styles: Styles }) {
  const [vertical, setVertical] = useState<Vertical>('homeservice');
  const [segment, setSegment] = useState('all');
  const [data, setData] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (v: Vertical, s: string) => {
    setLoading(true);
    const res = await fetchDemand(v, s);
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.message || 'Could not load demand');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(vertical, segment);
    }, [load, vertical, segment])
  );

  const m = data?.model;
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <SegmentedControl
        options={VERTICALS}
        value={vertical}
        onChange={(v) => {
          setVertical(v);
          setSegment('all');
        }}
      />
      {!!data?.segments?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {[{ key: 'all', label: 'All' }, ...data.segments.filter((s) => s.key !== 'all')].map((s) => (
            <Chip key={s.key} label={s.label} selected={segment === s.key} onPress={() => setSegment(s.key)} style={styles.chip} />
          ))}
        </ScrollView>
      )}
      {error && !data ? (
        <ErrorState title="Demand unavailable" message={error} onRetry={() => load(vertical, segment)} />
      ) : !data ? (
        <SkeletonCard lines={5} />
      ) : (
        <Card style={[styles.card, loading && styles.refetching]}>
          <Text style={styles.cardTitle}>Daily {UNITS[vertical]}</Text>
          <Text style={styles.cardSub}>Last {data.history.length} days, and the next {data.forecast.length} forecast</Text>
          <View style={styles.chartWrap}>
            <ForecastChart history={data.history} forecast={data.forecast} unit={UNITS[vertical]} />
          </View>
          {m ? (
            <View style={styles.badges}>
              <ToneBadge label={methodLabel(m.method)} tone="neutral" icon="analytics-outline" style={styles.badge} />
              {m.metrics?.wape != null && (
                <ToneBadge label={`Misses ~${Math.round((m.metrics.wape as number) * 100)}% of volume (backtest)`} tone="info" style={styles.badge} />
              )}
              {m.metrics?.mase != null && (
                <ToneBadge
                  label={(m.metrics.mase as number) < 1 ? 'Beats "same as last week"' : 'No better than last week yet'}
                  tone={(m.metrics.mase as number) < 1 ? 'success' : 'warning'}
                  style={styles.badge}
                />
              )}
              {m.dataQuality && m.dataQuality !== 'ok' && (
                <ToneBadge label={m.dataQuality === 'thin' ? 'Little history yet' : 'Short history'} tone="warning" style={styles.badge} />
              )}
              {m.source === 'synthetic' && <ToneBadge label="Synthetic demo data" tone="warning" icon="flask-outline" style={styles.badge} />}
            </View>
          ) : (
            <Text style={styles.foot}>No forecast yet — the nightly ML job writes one once it has run.</Text>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

function PerformanceTab({ styles }: { styles: Styles }) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [module, setModule] = useState<Vertical>('homeservice');
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setRows(null);
      fetchPerformance(module).then((res) => {
        if (!alive) return;
        if (res.success && res.data) {
          setRows(res.data.rows);
          setError(null);
        } else setError(res.message || 'Could not load performance');
      });
      return () => {
        alive = false;
      };
    }, [module])
  );

  const line = (r: any): { primary: string; secondary: string } => {
    if (module === 'homeservice')
      return {
        primary: `${r.completed} done of ${r.requests} · ${pct(r.completionRate)} completion`,
        secondary: `★ ${r.rating || '—'} (${r.reviews}) · ${r.declined} declined · ${r.providerCancelled} cancelled · ${formatMoney(r.earnings)}`,
      };
    if (module === 'healthcare')
      return {
        primary: `${r.completed} of ${r.appointments} appointments · ${pct(r.completionRate)} completed`,
        secondary: `${r.specialty || 'Doctor'} · ★ ${r.rating || '—'} (${r.reviews}) · ${r.doctorCancelled} cancelled by doctor`,
      };
    return {
      primary: `${formatMoney(r.gmv)} delivered · ${r.orders} orders`,
      secondary: `${pct(r.fulfilmentRate)} fulfilled · ${pct(r.returnRate)} returned · ${r.cancelled} cancelled`,
    };
  };

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <SegmentedControl options={VERTICALS} value={module} onChange={setModule} />
      <SectionHeader title="Last 90 days" subtitle="Ranked by completed work, then reliability" style={styles.section} />
      {error ? (
        <ErrorState title="Performance unavailable" message={error} />
      ) : !rows ? (
        <SkeletonCard lines={4} />
      ) : !rows.length ? (
        <EmptyState icon="podium-outline" title="Nothing in this window" message="Leaderboards fill in as bookings, appointments and orders come in." />
      ) : (
        rows.map((r, i) => {
          const l = line(r);
          const providerId: string | null = r.providerId ?? null;
          return (
            <Card key={r.id} style={styles.rankCard}>
              <Pressable
                style={({ pressed }) => [styles.rankRow, pressed && styles.rankPressed]}
                onPress={providerId ? () => openProvider(navigation, providerId) : undefined}
                disabled={!providerId}
                accessibilityRole={providerId ? 'button' : undefined}
                accessibilityLabel={`${i + 1}. ${r.name}. ${l.primary}. ${l.secondary}${providerId ? '. Opens their details and analytics.' : ''}`}
              >
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={styles.rankBody}>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.rankPrimary}>{l.primary}</Text>
                  <Text style={styles.rankSecondary}>{l.secondary}</Text>
                  {!providerId && module === 'shopping' && <Text style={styles.rankSecondary}>Admin-managed brand, no provider</Text>}
                </View>
                {!!providerId && <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />}
              </Pressable>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tabs: { paddingHorizontal: GUTTER, paddingTop: S.md },
    pad: { padding: GUTTER, paddingBottom: S.huge },
    tileRow: { flexDirection: 'row', marginBottom: S.md },
    tile: { flex: 1, marginRight: S.sm },
    foot: { ...T.caption, color: c.inkMuted, marginTop: S.sm },
    chips: { marginTop: S.md, flexGrow: 0 },
    chip: { marginRight: S.sm },
    card: { marginTop: S.md },
    refetching: { opacity: 0.55 },
    cardTitle: { ...T.subhead, color: c.ink },
    cardSub: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    chartWrap: { marginTop: S.md },
    badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.md },
    badge: { marginRight: S.xs, marginBottom: S.xs },
    section: { marginTop: S.lg },
    rankCard: { marginBottom: S.sm },
    rankRow: { flexDirection: 'row', alignItems: 'center' },
    rankPressed: { opacity: 0.6 },
    rank: { ...T.heading, color: c.inkFaint, width: 32 },
    rankBody: { flex: 1 },
    rankName: { ...T.subhead, color: c.ink },
    rankPrimary: { ...T.caption, color: c.ink, marginTop: 2 },
    rankSecondary: { ...T.caption, color: c.inkMuted, marginTop: 2 },
  });
