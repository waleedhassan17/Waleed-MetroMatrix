import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  getNotificationsAsync,
  markAsReadAsync,
  markAllAsReadAsync,
  deleteNotificationAsync,
  selectNotifications,
  selectUnreadCount,
  selectIsLoading,
} from './notificationSlice';
import { AdminNotification, NotificationType } from '../../../models/admin';

type IconName = keyof typeof Ionicons.glyphMap;

const NotificationCard = ({
  notification,
  index,
  onPress,
  onDelete,
}: {
  notification: AdminNotification;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTypeConfig = (type: NotificationType): { icon: IconName; color: string; bgColor: string } => {
    const configs: Record<NotificationType, { icon: IconName; color: string; bgColor: string }> = {
      provider_registration: { icon: 'person-add', color: '#6366f1', bgColor: '#eef2ff' },
      provider_approved: { icon: 'checkmark-circle', color: '#10b981', bgColor: '#ecfdf5' },
      provider_rejected: { icon: 'close-circle', color: '#ef4444', bgColor: '#fef2f2' },
      user_registration: { icon: 'people', color: '#3b82f6', bgColor: '#eff6ff' },
      system_alert: { icon: 'warning', color: '#f59e0b', bgColor: '#fffbeb' },
      report: { icon: 'flag', color: '#ef4444', bgColor: '#fef2f2' },
    };
    return configs[type] || { icon: 'notifications', color: '#6366f1', bgColor: '#eef2ff' };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const config = getTypeConfig(notification.type);

  return (
    <Animated.View
      style={[
        styles.notificationCard,
        !notification.isRead && styles.notificationCardUnread,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity style={styles.notificationContent} onPress={onPress} activeOpacity={0.7}>
        {!notification.isRead && <View style={styles.unreadDot} />}
        
        <View style={[styles.notificationIcon, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>

        <View style={styles.notificationBody}>
          <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const isLoading = useAppSelector(selectIsLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    dispatch(getNotificationsAsync({}));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getNotificationsAsync({}));
    setTimeout(() => setRefreshing(false), 1000);
  }, [dispatch]);

  const handleNotificationPress = async (notification: AdminNotification) => {
    if (!notification.isRead) {
      await dispatch(markAsReadAsync(notification._id || notification.id!));
    }
    // Navigate based on notification type
    if (notification.data?.providerId) {
      // navigation.navigate('ProviderDetails', { providerId: notification.data.providerId });
    }
  };

  const handleDelete = (notificationId: string) => {
    Alert.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteNotificationAsync(notificationId)),
      },
    ]);
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      dispatch(markAllAsReadAsync());
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n: AdminNotification) => !n.isRead)
    : notifications;

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient colors={['#f1f5f9', '#e2e8f0']} style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={48} color="#94a3b8" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread' ? 'All caught up! No unread notifications.' : 'You don\'t have any notifications yet.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'unread' && styles.filterBtnActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterBtnText, filter === 'unread' && styles.filterBtnTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item, index }) => (
            <NotificationCard
              notification={item}
              index={index}
              onPress={() => handleNotificationPress(item)}
              onDelete={() => handleDelete(item._id || item.id!)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366f1']} />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  filterBtnTextActive: {
    color: '#6366f1',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  notificationCardUnread: {
    backgroundColor: '#fefce8',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default NotificationsScreen;