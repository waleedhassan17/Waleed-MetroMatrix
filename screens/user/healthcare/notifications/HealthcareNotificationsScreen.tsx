import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// ── Theme ───────────────────────────────────
const THEME = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  surface: '#FFFFFF',
  bg: '#F7F9FC',
  textPrimary: '#1A1A1A',
  textSecondary: '#64748B',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// ── Notification Types ──────────────────────
type NotifType =
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'prescription_ready'
  | 'lab_result'
  | 'video_call'
  | 'general';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionRoute?: string;
  actionParams?: Record<string, string>;
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  appointment_confirmed: { icon: 'calendar-check', color: THEME.success, bg: '#ECFDF5' },
  appointment_reminder: { icon: 'clock-alert', color: THEME.warning, bg: '#FFFBEB' },
  appointment_cancelled: { icon: 'calendar-remove', color: THEME.error, bg: '#FEF2F2' },
  prescription_ready: { icon: 'file-document-check', color: THEME.primary, bg: THEME.primaryLight },
  lab_result: { icon: 'test-tube', color: '#7C3AED', bg: '#F5F3FF' },
  video_call: { icon: 'video', color: '#06B6D4', bg: '#ECFEFF' },
  general: { icon: 'bell', color: THEME.textSecondary, bg: '#F1F5F9' },
};

// ── Sample Notifications (until API) ────────
const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'appointment_reminder',
    title: 'Appointment Reminder',
    message: 'Your appointment with Dr. Ahmed Hassan is tomorrow at 10:30 AM. Please be ready 10 minutes early.',
    time: '2 hours ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'appointment_confirmed',
    title: 'Appointment Confirmed',
    message: 'Your appointment has been confirmed by Dr. Sarah Khan (Cardiologist) for Jan 25, 2025 at 3:00 PM.',
    time: '5 hours ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'prescription_ready',
    title: 'Prescription Ready',
    message: 'Dr. Ahmed Hassan has issued your prescription from your last visit on Jan 20, 2025. You can view and download it now.',
    time: '1 day ago',
    isRead: true,
  },
  {
    id: '4',
    type: 'lab_result',
    title: 'Lab Report Available',
    message: 'Your CBC (Complete Blood Count) test results from City Lab are now available in your Health Records.',
    time: '2 days ago',
    isRead: true,
  },
  {
    id: '5',
    type: 'video_call',
    title: 'Video Consultation Starting',
    message: 'Dr. Fatima Ali is ready to join your video consultation. Join now to start your session.',
    time: '3 days ago',
    isRead: true,
  },
  {
    id: '6',
    type: 'appointment_cancelled',
    title: 'Appointment Cancelled',
    message: 'Dr. Omar Farooq has cancelled your appointment on Jan 18, 2025. Please rebook at your convenience.',
    time: '4 days ago',
    isRead: true,
  },
  {
    id: '7',
    type: 'general',
    title: 'Health Tip of the Day',
    message: 'Staying hydrated improves concentration and energy levels. Aim for 8 glasses of water daily!',
    time: '5 days ago',
    isRead: true,
  },
];

type FilterType = 'all' | 'unread';

// ── Main Screen ─────────────────────────────
const HealthcareNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const displayed = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const renderItem = ({ item }: { item: Notification }) => {
    const config = TYPE_CONFIG[item.type];

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        onPress={() => markRead(item.id)}
        activeOpacity={0.8}
      >
        {!item.isRead && <View style={styles.unreadDot} />}
        <View style={[styles.notifIconBg, { backgroundColor: config.bg }]}>
          <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifTitleRow}>
            <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={THEME.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* Header */}
      <LinearGradient
        colors={['#2A7FFF', '#1857C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </LinearGradient>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['all', 'unread'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="notifications-off-outline" size={40} color={THEME.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyMessage}>
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : 'Your healthcare notifications will appear here.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  markAllText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  headerRight: { width: 60 },

  // Filter
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: { backgroundColor: THEME.primaryLight },
  filterTabText: { fontSize: 13, fontWeight: '500', color: THEME.textSecondary },
  filterTabTextActive: { color: THEME.primary, fontWeight: '700' },

  // List
  listContent: { padding: 16 },
  separator: { height: 8 },

  // Notification Card
  notifCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.border,
    position: 'relative',
  },
  notifCardUnread: {
    borderColor: `${THEME.primary}30`,
    backgroundColor: `${THEME.primary}06`,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  notifIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 6,
  },
  notifContent: { flex: 1 },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  notifTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  notifTitleUnread: { fontWeight: '700' },
  notifTime: { fontSize: 11, color: THEME.textSecondary, flexShrink: 0 },
  notifMessage: { fontSize: 13, color: THEME.textSecondary, lineHeight: 18 },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, marginBottom: 8 },
  emptyMessage: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HealthcareNotificationsScreen;
