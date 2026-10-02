// ============================================================================
// Shopping notifications — one inbox, two audiences.
//
// Customers see their orders move (confirmed, shipped, delivered, refunded);
// vendors see new orders, customer cancellations and return requests. The
// same rows arrive as push notifications; this is where they stay.
// Read state is the server's, so it follows the account across devices.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppBar, EmptyState, ErrorState, Screen, Skeleton } from '../../../components/ui';
import { GUTTER, R, S, T } from '../../../constants/theme';
import { ThemeColors, useTheme } from '../../../theme';
import {
  fetchShoppingNotificationsApi,
  markAllShoppingNotificationsReadApi,
  markShoppingNotificationReadApi,
  ShoppingNotification,
} from '../../../networks/shopping/notificationApi';
import { relativeTime } from '../../../utils/homeservice/format';

const TYPE_ICONS: Record<string, string> = {
  order_placed: 'bag-check-outline',
  order_created: 'receipt-outline',
  order_update: 'cube-outline',
  order_cancelled: 'close-circle-outline',
  return_requested: 'return-up-back-outline',
  product_moderation: 'shield-checkmark-outline',
};

type Params = { audience?: 'customer' | 'vendor' };

export default function ShoppingNotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const audience = route.params?.audience === 'vendor' ? 'vendor' : 'customer';

  const [rows, setRows] = useState<ShoppingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    asRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setRows(await fetchShoppingNotificationsApi());
    } catch (e: any) {
      setError(e?.message || 'Failed to load notifications');
    }
    asRefresh ? setRefreshing(false) : setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unread = rows.filter((r) => !r.isRead).length;

  const open = (n: ShoppingNotification) => {
    if (!n.isRead) {
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, isRead: true } : r)));
      void markShoppingNotificationReadApi(n.id);
    }
    const orderId = n.data?.orderId;
    if (audience === 'vendor') {
      if (n.type === 'return_requested') navigation.navigate('BrandReturnRequests');
      else if (orderId) navigation.navigate('BrandOrderDetail', { orderId });
    } else if (orderId) {
      navigation.navigate('OrderDetail', { orderId });
    }
  };

  const markAll = async () => {
    setRows((prev) => prev.map((r) => ({ ...r, isRead: true })));
    try {
      await markAllShoppingNotificationsReadApi();
    } catch {
      load(true);
    }
  };

  return (
    <Screen>
      <AppBar
        title="Notifications"
        subtitle={unread ? `${unread} unread` : undefined}
        onBack={() => navigation.goBack()}
        rightIcon={unread ? 'checkmark-done-outline' : undefined}
        onRightPress={unread ? markAll : undefined}
      />
      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={72} radius={R.card} style={styles.gap} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="We couldn't load notifications" message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="Nothing yet"
              message={
                audience === 'vendor'
                  ? 'New orders, cancellations and return requests will land here.'
                  : 'Updates about your orders will land here.'
              }
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, !item.isRead && styles.rowUnread]}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.message}${item.isRead ? '' : '. Unread'}`}
            >
              <View style={styles.icon}>
                <Ionicons name={(TYPE_ICONS[item.type] || 'notifications-outline') as any} size={19} color={colors.inkMuted} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    list: { padding: GUTTER, flexGrow: 1 },
    gap: { marginBottom: S.md },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: S.md,
      marginBottom: S.sm,
      borderRadius: R.card,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    rowUnread: { borderColor: c.accentLine },
    icon: {
      width: 36,
      height: 36,
      borderRadius: R.control,
      backgroundColor: c.surfaceSunken,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, marginLeft: S.md },
    title: { ...T.label, color: c.ink },
    titleUnread: { ...T.subhead },
    message: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    time: { ...T.micro, color: c.inkFaint, marginTop: S.xs },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: S.xs },
  });
