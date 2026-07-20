// ============================================
// Home-service notifications (HS8) — booking lifecycle notifications derived
// server-side from statusHistory (GET /user/notifications). Read state is
// kept locally (AsyncStorage) — honest scope: no push infrastructure.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchHSNotifications,
  HSNotification,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const READ_KEY = 'hs_notifications_read';

const TYPE_ICONS: Record<string, { icon: any; color: string }> = {
  PENDING: { icon: 'time-outline', color: '#F59E0B' },
  ACCEPTED: { icon: 'checkmark-circle-outline', color: '#3B82F6' },
  REJECTED: { icon: 'close-circle-outline', color: '#EF4444' },
  CANCELLED: { icon: 'close-circle-outline', color: '#EF4444' },
  EN_ROUTE: { icon: 'navigate-outline', color: '#8B5CF6' },
  ARRIVED: { icon: 'location-outline', color: '#06B6D4' },
  IN_PROGRESS: { icon: 'construct-outline', color: '#F97316' },
  COMPLETED: { icon: 'trophy-outline', color: '#10B981' },
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

  const renderItem = ({ item }: { item: HSNotification }) => {
    const meta = TYPE_ICONS[item.type] || { icon: 'notifications-outline', color: '#6B7280' };
    const unread = !readIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, unread && styles.cardUnread]}
        onPress={() => openNotification(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, unread && styles.titleUnread]}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={1}>
            {item.body}
          </Text>
          <Text style={styles.time}>{new Date(item.at).toLocaleString()}</Text>
        </View>
        {unread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
          <Ionicons name="checkmark-done" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.stateText}>Loading notifications…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={44} color="#D1D5DB" />
              <Text style={styles.stateText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 14,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 10,
  },
  cardUnread: { borderColor: '#C7D2FE', backgroundColor: '#F5F7FF' },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: 14, color: '#374151', fontWeight: '600' },
  titleUnread: { color: '#111827', fontWeight: '700' },
  body: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5', marginLeft: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: '#6B7280', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
