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

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
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
import { C, F, GUTTER, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import { AppBar, Screen } from '../../../../components/ui';

/**
 * Icon and tint per event, so the list is scannable without reading it.
 *
 * A function of the ramp rather than a frozen table: every `bg` here is a
 * `*Soft` token, and those are near-white in light and near-black in dark.
 */
const makeLook = (c: ThemeColors): Record<string, { icon: any; color: string; bg: string }> => {
  const ACCENT = c.accent;
  const ACCENT_SOFT = c.accentSoft;
return {
    booking_created: { icon: 'add-circle-outline', color: ACCENT, bg: ACCENT_SOFT },
    booking_accepted: { icon: 'checkmark-circle-outline', color: ACCENT, bg: ACCENT_SOFT },
    booking_rejected: { icon: 'close-circle-outline', color: c.error, bg: c.errorSoft },
    booking_cancelled: { icon: 'close-circle-outline', color: c.error, bg: c.errorSoft },
    booking_en_route: { icon: 'navigate-outline', color: c.info, bg: c.infoSoft },
    booking_arrived: { icon: 'location-outline', color: c.info, bg: c.infoSoft },
    booking_in_progress: { icon: 'construct-outline', color: c.warning, bg: c.warningSoft },
    booking_completed: { icon: 'checkmark-done-outline', color: ACCENT, bg: ACCENT_SOFT },
    message: { icon: 'chatbubble-outline', color: c.info, bg: c.infoSoft },
    missed_call: { icon: 'call-outline', color: c.error, bg: c.errorSoft },
    payment_requested: { icon: 'cash-outline', color: c.warning, bg: c.warningSoft },
    payment_received: { icon: 'cash-outline', color: ACCENT, bg: ACCENT_SOFT },
  };
};

const fallbackLook = (c: ThemeColors) => ({
  icon: 'notifications-outline' as any,
  color: c.inkMuted,
  bg: c.lineSoft,
});

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
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const LOOK = useMemo(() => makeLook(colors), [colors]);
  const FALLBACK_LOOK = useMemo(() => fallbackLook(colors), [colors]);
  const ACCENT = colors.accent;
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
    <Screen>
      <AppBar
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : undefined}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={markAll}
            disabled={!unread}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="checkmark-done" size={22} color={unread ? colors.ink : colors.inkFaint} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.inkFaint} />
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
              <Ionicons name="notifications-off-outline" size={48} color={colors.inkFaint} />
              <Text style={styles.emptyTitle}>You're all caught up</Text>
              <Text style={styles.stateText}>
                New bookings, messages and job updates will appear here.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxxl },
  emptyContent: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingHorizontal: GUTTER,
    paddingVertical: S.md + 2,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  rowUnread: { backgroundColor: c.accentSoft },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { ...T.subhead, color: c.ink, flex: 1 },
  titleUnread: { fontFamily: F.bold },
  time: { ...T.caption, color: c.inkFaint },
  message: { ...T.body, color: c.inkMuted, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
  emptyTitle: { ...T.heading, color: c.ink, marginTop: S.md + 2 },
  stateText: { ...T.body, color: c.inkMuted, textAlign: 'center', marginTop: S.sm },
  retryBtn: {
    marginTop: S.lg + 2,
    paddingHorizontal: S.xxl + 2,
    paddingVertical: S.md - 1,
    borderRadius: R.pill,
    backgroundColor: c.accent,
  },
  retryText: { ...T.label, fontFamily: F.bold, color: c.inkInverse },
});
