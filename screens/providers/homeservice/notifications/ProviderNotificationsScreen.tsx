// ============================================================================
// The provider's notifications.
//
// Until now the provider vertical had none: the dashboard bell was a
// TouchableOpacity with no onPress, and its badge showed the count of PENDING
// BOOKING REQUESTS under a notifications label — a number that could never be
// cleared by reading anything, because nothing it counted was a notification.
//
// Structure follows DoctorNotificationsScreen, which already solves this shape
// well (header with mark-all, three-way empty state, optimistic read). What
// differs: rows here are typed and tap through to the job they refer to, and
// the data is genuinely persisted rather than synthesized per request.
// ============================================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type HSNotification,
  type HSNotificationType,
} from '../../../../networks/serviceProviders/notificationsNetwork';
import { useAppDispatch } from '../../../../hooks/useReduxHooks';
import { markNotificationsRead } from '../tabs/dashboard/dashboardSlice';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C } from '../../../../constants/theme';

const ACCENT = HS.accent;
const ACCENT_SOFT = HS.accentSoft;

/** Icon and tint per event, so the list is scannable without reading it. */
const LOOK: Record<string, { icon: any; color: string; bg: string }> = {
  booking_created: { icon: 'add-circle-outline', color: ACCENT, bg: ACCENT_SOFT },
  booking_accepted: { icon: 'checkmark-circle-outline', color: ACCENT, bg: ACCENT_SOFT },
  booking_rejected: { icon: 'close-circle-outline', color: C.error, bg: C.errorSoft },
  booking_cancelled: { icon: 'close-circle-outline', color: C.error, bg: C.errorSoft },
  booking_en_route: { icon: 'navigate-outline', color: C.info, bg: C.infoSoft },
  booking_arrived: { icon: 'location-outline', color: C.info, bg: C.infoSoft },
  booking_in_progress: { icon: 'construct-outline', color: C.warning, bg: C.warningSoft },
  booking_completed: { icon: 'checkmark-done-outline', color: ACCENT, bg: ACCENT_SOFT },
  message: { icon: 'chatbubble-outline', color: C.info, bg: C.infoSoft },
  missed_call: { icon: 'call-outline', color: C.error, bg: C.errorSoft },
  payment_requested: { icon: 'cash-outline', color: C.warning, bg: C.warningSoft },
  payment_received: { icon: 'cash-outline', color: ACCENT, bg: ACCENT_SOFT },
};

const FALLBACK_LOOK = { icon: 'notifications-outline' as any, color: C.inkMuted, bg: C.lineSoft };

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function ProviderNotificationsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [rows, setRows] = useState<HSNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unread = rows.filter((n) => !n.isRead).length;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const res = await fetchNotifications();
    if (res.success && res.data) {
      setRows(res.data.notifications || []);
      setError(null);
    } else {
      setError(res.message || "Couldn't load your notifications");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload on focus, not just on mount: the badge that brought the user here is
  // computed on the dashboard, and coming back to a stale list after acting on
  // something elsewhere is the obvious way for this screen to look broken.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openRow = async (n: HSNotification) => {
    if (!n.isRead) {
      // Optimistic: the row greys out immediately. A failed PATCH self-corrects
      // on the next focus, and pretending otherwise would make every tap feel
      // like it did nothing.
      setRows((r) => r.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    const bookingId = n.data?.bookingId;
    if (!bookingId) return;

    // Chat and calls take a bookingId and resolve the rest themselves.
    if (n.type === 'message' || n.type === 'missed_call') {
      navigation.navigate('ProviderJobChat', { bookingId });
      return;
    }

    // Booking events go to the Jobs tab, NOT to JobDetail. JobDetail requires
    // the whole job object as a param and falls back to a Redux slice that is
    // empty on a cold open — passing only an id leaves it on "Loading job
    // details…" forever. The Jobs list is always valid and one tap away from
    // the job itself.
    navigation.navigate('HomeServiceProviderDashboard', { screen: 'Jobs' });
  };

  const markAll = async () => {
    if (!unread) return;
    setRows((r) => r.map((x) => ({ ...x, isRead: true })));
    // Clears the dashboard bell badge without waiting for a dashboard refetch.
    // This reducer already existed and had never been dispatched anywhere.
    dispatch(markNotificationsRead());
    markAllNotificationsRead().catch(() => {});
  };

  const renderRow = ({ item }: { item: HSNotification }) => {
    const look = LOOK[item.type as HSNotificationType] || FALLBACK_LOOK;
    return (
      <TouchableOpacity
        style={[styles.row, !item.isRead && styles.rowUnread]}
        onPress={() => openRow(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: look.bg }]}>
          <Ionicons name={look.icon} size={20} color={look.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        {!item.isRead && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications{unread > 0 ? ` (${unread})` : ''}
        </Text>
        <TouchableOpacity
          onPress={markAll}
          disabled={!unread}
          style={styles.headerBtn}
          accessibilityLabel="Mark all as read"
        >
          <Ionicons name="checkmark-done" size={22} color={unread ? '#fff' : 'rgba(255,255,255,0.4)'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={C.inkFaint} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          renderItem={renderRow}
          contentContainerStyle={rows.length ? undefined : styles.emptyContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color={C.inkFaint} />
              <Text style={styles.emptyTitle}>You're all caught up</Text>
              <Text style={styles.stateText}>
                New bookings, messages and job updates will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: ACCENT,
  },
  headerBtn: { padding: 6, width: 40, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContent: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  rowUnread: { backgroundColor: HS.accentSoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: '600', color: C.ink, flex: 1 },
  titleUnread: { fontWeight: '800' },
  time: { fontSize: 12, color: C.inkFaint },
  message: { fontSize: 13, color: C.inkMuted, marginTop: 3, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 14 },
  stateText: { fontSize: 14, color: C.inkMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: {
    marginTop: 18,
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: ACCENT,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
