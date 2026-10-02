// ============================================================================
// Home services — admin overview tab.
//
// This tab used to render a hardcoded slice: "12,847 users", Lahore and
// Faisalabad revenue by month, invented growth percentages — numbers that
// never came from the database and never changed. It now reads the real
// home-service dashboard (GET /admin/homeservice/dashboard) and links to the
// live platform analytics.
// ============================================================================

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, ErrorState, ListRow, Screen, SectionHeader, SkeletonCard, StatTile } from '../../../../../../components/ui';
import { GUTTER, S, T } from '../../../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../../../theme';
import { fetchAdminHSDashboard } from '../../../../../../networks/serviceProviders/adminHomeServiceApi';
import DemandMini from './DemandMini';

interface Dashboard {
  pendingProviderApprovals: number;
  bookingsToday: number;
  gmvToday: number;
  openDisputes: number;
  pendingPayouts: number;
  activeProvidersOnline: number;
}

export default function HomeServiceOverviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    const res = await fetchAdminHSDashboard();
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else setError(res.message || 'Could not load the dashboard');
    if (asRefresh) setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <AppBar title="Home services" subtitle="Today at a glance" onBack={() => navigation.goBack()} />
      {!data && error ? (
        <ErrorState title="Dashboard unavailable" message={error} onRetry={() => load()} />
      ) : !data ? (
        <View style={styles.pad}>
          <SkeletonCard lines={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pad} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
          <View style={styles.row}>
            <StatTile label="Bookings today" value={data.bookingsToday.toLocaleString('en-PK')} style={styles.tile} />
            <StatTile label="GMV today" value={`Rs. ${Math.round(data.gmvToday).toLocaleString('en-PK')}`} style={styles.tile} />
          </View>
          <View style={styles.row}>
            <StatTile label="Providers online" value={data.activeProvidersOnline} tone="accent" style={styles.tile} />
            <StatTile
              label="Awaiting approval"
              value={data.pendingProviderApprovals}
              tone={data.pendingProviderApprovals ? 'warning' : 'neutral'}
              style={styles.tile}
            />
          </View>
          <View style={styles.row}>
            <StatTile label="Open disputes" value={data.openDisputes} tone={data.openDisputes ? 'error' : 'neutral'} style={styles.tile} onPress={() => navigation.navigate('AdminHSDisputes')} />
            <StatTile label="Payouts to review" value={data.pendingPayouts} tone={data.pendingPayouts ? 'warning' : 'neutral'} style={styles.tile} onPress={() => navigation.navigate('AdminHSPayouts')} />
          </View>

          <SectionHeader title="Demand" subtitle="Booking requests, actual and forecast" style={styles.section} />
          <DemandMini />

          <SectionHeader title="More" style={styles.section} />
          <ListRow icon="pulse-outline" title="Live platform analytics" subtitle="Right now, demand forecasts, leaderboards" onPress={() => navigation.navigate('PlatformAnalytics')} />
          <ListRow icon="bar-chart-outline" title="Home-service analytics" subtitle="Bookings, revenue and top providers by date range" onPress={() => navigation.navigate('AdminHSAnalytics')} divider />
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pad: { padding: GUTTER, paddingBottom: S.huge },
    row: { flexDirection: 'row', marginBottom: S.md },
    tile: { flex: 1, marginRight: S.sm },
    section: { marginTop: S.lg },
    note: { ...T.caption, color: c.inkMuted },
  });
