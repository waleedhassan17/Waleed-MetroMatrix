// ============================================================================
// Home-service notifications — booking lifecycle events derived server-side
// from statusHistory. Read state is kept locally (AsyncStorage) — honest
// scope: there is no push infrastructure.
//
// Eight notification types used to carry eight different accent hues, which
// made the feed read as a colour chart. The icon says what happened; unread is
// carried by weight and one dot.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AppBar,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
} from '../../../../components/ui';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, R, S, T } from '../../../../constants/theme';
import {
  fetchHSNotifications,
  HSNotification,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';
import { relativeTime } from '../../../../utils/homeservice/format';

const READ_KEY = 'hs_notifications_read';

const TYPE_ICONS: Record<string, string> = {
  PENDING: 'time-outline',
  ACCEPTED: 'checkmark-circle-outline',
  REJECTED: 'close-circle-outline',
  CANCELLED: 'close-circle-outline',
  EN_ROUTE: 'navigate-outline',
  ARRIVED: 'location-outline',
  IN_PROGRESS: 'construct-outline',
  COMPLETED: 'checkmark-done-outline',
};

export default function HomeServiceNotificationsScreen() {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<HSNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    asRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    const [res, stored] = await Promise.all([
      fetchHSNotifications(),
      AsyncStorage.getItem(READ_KEY),
    ]);
    if (res.success) {
      setRows(res.data || []);
      setReadIds(new Set(stored ? JSON.parse(stored) : []));
    } else {
      setError(res.message || 'Failed to load notifications');
    }
    asRefresh ? setRefreshing(false) : setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    const ids = rows.map((r) => r.id);
    setReadIds(new Set(ids));
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(ids));
  };

  const openNotification = async (n: HSNotification) => {
    const next = new Set(readIds);
    next.add(n.id);
    setReadIds(next);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify([...next]));
    navigation.navigate('BookingDetail', { bookingId: n.bookingId });
  };

  const unreadCount = rows.filter((r) => !readIds.has(r.id)).length;

  const renderItem = ({ item }: { item: HSNotification }) => {
    const icon = TYPE_ICONS[item.type] || 'notifications-outline';
    const unread = !readIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, unread && styles.rowUnread]}
        onPress={() => openNotification(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <View style={[styles.icon, unread && styles.iconUnread]}>
          <Ionicons name={icon as any} size={18} color={unread ? HS.accentDeep : C.inkMuted} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={1}>
            {item.body}
          </Text>
          {/* `new Date(...).toLocaleString()` printed the full locale dump on
              every row; a feed wants "3h ago". */}
          <Text style={styles.time}>{relativeTime(item.at)}</Text>
        </View>
        {unread && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <AppBar
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightIcon={unreadCount > 0 ? 'checkmark-done-outline' : undefined}
        onRightPress={unreadCount > 0 ? markAllRead : undefined}
      />

      {loading ? (
        <View style={styles.loading} accessibilityLabel="Loading notifications">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={72} radius={R.card} style={styles.loadingGap} />
          ))}
        </View>
      ) : error ? (
        <ErrorState
          title="We couldn't load your notifications"
          message={error}
          onRetry={() => load()}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={HS.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="Nothing yet"
              message="Updates about your bookings will land here."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: GUTTER,
    flexGrow: 1,
  },
  loading: {
    padding: GUTTER,
  },
  loadingGap: {
    marginBottom: S.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.lg,
    marginBottom: S.sm,
    borderRadius: R.card,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  rowUnread: {
    borderColor: HS.accentLine,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: R.control,
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: {
    backgroundColor: HS.accentSoft,
  },
  body: {
    flex: 1,
    marginLeft: S.md,
  },
  title: {
    ...T.body,
    color: C.ink,
  },
  titleUnread: {
    ...T.bodyStrong,
    color: C.ink,
  },
  message: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: 1,
  },
  time: {
    ...T.caption,
    color: C.inkFaint,
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: HS.accent,
    marginLeft: S.sm,
  },
});
