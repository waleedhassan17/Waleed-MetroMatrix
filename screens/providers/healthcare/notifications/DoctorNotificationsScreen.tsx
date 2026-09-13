import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AppBar,
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonCard,
  showToast,
} from '../../../../components/ui';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import {
  fetchDoctorNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../../../../networks/healthcare/providerApi';
import { ThemeColors, useTheme } from '../../../../theme';
import { formatDayHeading, formatTime } from '../../../../utils/healthcare/doctorFormat';
import { dateKeyOf, todayDateKey } from '../../../../utils/healthcare/timeRanges';

// ============================================================================
// Notifications.
//
// Tapping a notification only marked it read; nothing opened. A new booking,
// a cancellation or a payment now opens the appointment it is about.
// "Mark all read" was optimistic with no way back when the request failed.
// ============================================================================

interface Row {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  appointmentId: string | null;
}

const STALE_MS = 30000;

const pad = (n: number) => String(n).padStart(2, '0');

const DoctorNotificationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const res = await fetchDoctorNotificationsApi();
    setRefreshing(false);
    if (!res.success) {
      setError(res.message || "We couldn't load your notifications");
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
      return;
    }
    lastFetchedAt.current = Date.now();
    setError(null);
    setStatus('ready');
    setRows(
      (res.data || []).map((n: any) => ({
        id: String(n._id || n.id || n.notificationId),
        title: n.title || 'Notification',
        message: n.message || '',
        isRead: !!(n.isRead ?? n.read),
        createdAt: n.createdAt || '',
        appointmentId: n.data?.appointmentId ? String(n.data.appointmentId) : null,
      }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!lastFetchedAt.current || Date.now() - lastFetchedAt.current > STALE_MS) load();
    }, [load])
  );

  const unread = rows.filter((r) => !r.isRead).length;
  const today = todayDateKey();

  const sections = useMemo(() => {
    const byDay = new Map<string, Row[]>();
    rows.forEach((row) => {
      const key = row.createdAt ? dateKeyOf(new Date(row.createdAt)) : today;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(row);
    });
    return [...byDay.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, title: formatDayHeading(key, today), data }));
  }, [rows, today]);

  const open = async (row: Row) => {
    if (!row.isRead) {
      setRows((r) => r.map((n) => (n.id === row.id ? { ...n, isRead: true } : n)));
      const res = await markNotificationReadApi(row.id);
      if (!res.success) setRows((r) => r.map((n) => (n.id === row.id ? { ...n, isRead: false } : n)));
    }
    if (row.appointmentId) {
      navigation.navigate(DoctorRouteNames.AppointmentDetail, { appointmentId: row.appointmentId });
    }
  };

  const markAll = async () => {
    const before = rows;
    setRows((r) => r.map((n) => ({ ...n, isRead: true })));
    const res = await markAllNotificationsReadApi();
    if (!res.success) {
      setRows(before);
      showToast({ message: res.message || "We couldn't mark them as read", tone: 'error' });
    }
  };

  return (
    <Screen>
      <AppBar
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={
          unread > 0 ? (
            <Button label="Read all" size="sm" variant="ghost" fullWidth={false} onPress={markAll} />
          ) : undefined
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListHeaderComponent={
          error && status === 'ready' ? <Text style={styles.stale}>Couldn't refresh. Pull down to try again.</Text> : null
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <SkeletonCard lines={2} />
          ) : status === 'error' ? (
            <ErrorState message={error} onRetry={() => load()} />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="You're all caught up"
              message="New bookings, cancellations and payments appear here."
            />
          )
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item, index, section }) => {
          const time = item.createdAt ? new Date(item.createdAt) : null;
          return (
            <TouchableOpacity
              onPress={() => open(item)}
              activeOpacity={0.7}
              style={[
                styles.row,
                index === 0 && styles.rowFirst,
                index === section.data.length - 1 && styles.rowLast,
                index > 0 && styles.divider,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${item.title}. ${item.message}`}
            >
              <View style={[styles.dot, { backgroundColor: item.isRead ? 'transparent' : colors.accent }]} />
              <View style={styles.body}>
                <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={2}>
                  {item.title}
                </Text>
                {!!item.message && (
                  <Text style={styles.message} numberOfLines={3}>
                    {item.message}
                  </Text>
                )}
                {time && <Text style={styles.time}>{formatTime(`${pad(time.getHours())}:${pad(time.getMinutes())}`)}</Text>}
              </View>
              {!!item.appointmentId && <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={<View style={styles.bottomSpace} />}
      />
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.md },
    stale: { ...T.caption, color: c.warning, marginBottom: S.sm },
    sectionTitle: { ...T.label, color: c.inkMuted, marginTop: S.lg, marginBottom: S.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      paddingHorizontal: S.lg,
      paddingVertical: S.md,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: R.card, borderTopRightRadius: R.card },
    rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: R.card, borderBottomRightRadius: R.card },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: S.md, alignSelf: 'flex-start', marginTop: 6 },
    body: { flex: 1, marginRight: S.sm },
    title: { ...T.body, color: c.ink },
    titleUnread: { ...T.bodyStrong },
    message: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    time: { ...T.caption, color: c.inkFaint, marginTop: S.xs },
    bottomSpace: { height: S.huge },
  });

export default DoctorNotificationsScreen;
