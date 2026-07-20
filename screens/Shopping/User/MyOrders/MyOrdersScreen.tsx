import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ClipboardList, Package, Truck, CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchMyOrders, selectMyOrders, setStatusFilter } from './myOrdersSlice';

const ShopColors = {
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF8F0',
  accent: '#F39C12',
  badge: '#E74C3C',
  success: '#10B981',
};

const filters = ['all', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const getStatusDetails = (status: string) => {
  switch (status.toLowerCase()) {
    case 'delivered':
      return { icon: <CheckCircle2 size={24} color={ShopColors.success} />, color: ShopColors.success, bg: '#ECFDF5' };
    case 'shipped':
    case 'out_for_delivery':
      return { icon: <Truck size={24} color={ShopColors.primary} />, color: ShopColors.primary, bg: ShopColors.primaryLight };
    case 'processing':
    case 'pending':
    case 'confirmed':
      return { icon: <Clock size={24} color={ShopColors.accent} />, color: ShopColors.accent, bg: '#FEF3C7' };
    case 'cancelled':
    case 'returned':
    case 'refunded':
      return { icon: <XCircle size={24} color={ShopColors.badge} />, color: ShopColors.badge, bg: '#FEF2F2' };
    default:
      return { icon: <Package size={24} color={Colors.text.tertiary} />, color: Colors.text.secondary, bg: Colors.borderLight };
  }
};

const MyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, statusFilter, loading, error } = useAppSelector(selectMyOrders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  // The server filters by status (matching the backend's real filter
  // semantics exactly) — a client-only filter over a single 50-item page
  // would silently hide older orders once a customer has more than that.
  const handleFilterPress = useCallback((filter: typeof filters[number]) => {
    dispatch(setStatusFilter(filter));
    dispatch(fetchMyOrders(filter === 'all' ? undefined : filter));
  }, [dispatch]);

  const filtered = orders;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => {
            const active = statusFilter === filter;
            return (
              <TouchableOpacity key={filter} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => handleFilterPress(filter)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && orders.length === 0 && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ShopColors.primary} />
        </View>
      )}

      {error && orders.length === 0 && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn't load your orders</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchMyOrders(statusFilter === 'all' ? undefined : statusFilter))}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map((order) => {
          const statusMeta = getStatusDetails(order.status);
          return (
            <TouchableOpacity 
              key={order.orderId} 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate(ShoppingRouteNames.OrderDetail, { orderId: order.orderId })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.orderIdWrap}>
                  <Package size={16} color={Colors.text.tertiary} strokeWidth={2} />
                  <Text style={styles.orderId}>Order #{order.orderId.substring(0, 8).toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                  <Text style={[styles.statusText, { color: statusMeta.color }]}>
                    {order.status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <View style={[styles.iconWrap, { backgroundColor: statusMeta.bg }]}>
                  {statusMeta.icon}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.orderTitle} numberOfLines={1}>{order.title}</Text>
                  <Text style={styles.metaDate}>Placed on {order.createdAt}</Text>
                  <Text style={styles.total}>PKR {order.total.toLocaleString()}</Text>
                </View>
                <ChevronRight size={20} color={Colors.borderDark} />
              </View>
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <ClipboardList size={48} stroke={ShopColors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtitle}>You don't have any orders with this status.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundAlt },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg, 
    paddingTop: (StatusBar.currentHeight || 0) + 16, 
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  iconBtn: { 
    width: 40, height: 40, borderRadius: BorderRadius.full, 
    alignItems: 'center', justifyContent: 'center', 
    backgroundColor: Colors.background, 
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  
  filterWrapper: {
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterChip: { 
    paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: BorderRadius.full, 
    backgroundColor: Colors.backgroundAlt, 
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  filterChipActive: { backgroundColor: ShopColors.primary, borderColor: ShopColors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  filterTextActive: { color: '#FFF' },
  
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: { 
    marginBottom: Spacing.md, 
    borderRadius: BorderRadius.xl, 
    backgroundColor: Colors.surface, 
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  orderIdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  orderTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 4 },
  metaDate: { fontSize: 12, color: Colors.text.tertiary, marginBottom: 8 },
  total: { fontSize: 15, fontWeight: '800', color: ShopColors.primaryDark },
  
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: ShopColors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  retryBtn: { marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: ShopColors.primary },
  retryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});

export default MyOrdersScreen;