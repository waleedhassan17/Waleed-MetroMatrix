import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchDoctorNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../../../../networks/healthcare/providerApi';

const C = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const DoctorNotificationsScreen: React.FC = () => {
  // react-native's SafeAreaView is a plain View on Android, so the back
  // button was drawing against the status-bar icons.
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchDoctorNotificationsApi();
    if (res.success) {
      setRows(
        (res.data || []).map((n: any) => ({
          id: String(n._id || n.id || n.notificationId),
          title: n.title || 'Notification',
          message: n.message || '',
          isRead: !!(n.isRead ?? n.read),
          createdAt: n.createdAt || '',
        }))
      );
    } else {
      setError(res.message || 'Something went wrong');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (id: string) => {
    setRows((r) => r.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await markNotificationReadApi(id);
  };

  const handleReadAll = async () => {
    setRows((r) => r.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsReadApi();
  };

  const unread = rows.filter((r) => !r.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications{unread ? ` (${unread})` : ''}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleReadAll} disabled={unread === 0}>
          <Ionicons name="checkmark-done" size={20} color={unread ? C.primary : C.textSec} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, rows.length === 0 && styles.listEmpty]}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => !item.isRead && handleRead(item.id)}
          >
            <View style={[styles.dot, { backgroundColor: item.isRead ? 'transparent' : C.primary }]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, !item.isRead && { fontWeight: '800' }]}>{item.title}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardDate}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.center}>
              <View style={[styles.medallion, styles.medallionError]}>
                <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
              </View>
              <Text style={styles.emptyTitle}>Couldn't load</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.medallion}>
                <Ionicons name="notifications-outline" size={34} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>You're all caught up</Text>
              <Text style={styles.emptySub}>
                New bookings, cancellations and patient messages will appear here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({

  // Shared doctor-screen chrome: safe-area header + a centred empty state.
  headerText: { flex: 1, alignItems: 'center' },
  subtitle: { fontSize: 12, color: C.textSec, marginTop: 1 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  medallion: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  medallionError: { backgroundColor: '#FEF2F2' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  emptySub: { fontSize: 13.5, color: C.textSec, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 24 },
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  list: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardUnread: { borderColor: C.primary, backgroundColor: C.primaryLight },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  cardMessage: { fontSize: 13, color: C.textSec, marginTop: 2, lineHeight: 18 },
  cardDate: { fontSize: 11, color: C.textSec, marginTop: 6 },
  center: { alignItems: 'center', paddingHorizontal: 8 },
  errorText: { color: C.textSec, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: C.textSec, marginTop: 10 },
});

export default DoctorNotificationsScreen;
