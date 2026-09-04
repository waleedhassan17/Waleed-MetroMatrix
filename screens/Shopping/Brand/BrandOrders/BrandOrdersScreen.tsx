import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ChevronRight,
  ClipboardList,
  RefreshCw,
  TriangleAlert,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Loader,
} from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchBrandOrders, selectBrandOrders, setStatusFilter } from './brandOrdersSlice';
import type { OrderStatus } from '../../../../types/shopping';
import { B } from '../theme';
import BrandHeader, { BrandHeaderAction } from '../BrandHeader';
import { ThemeColors, useTheme } from '../../../../theme';




const STATUS_MAP: Record<OrderStatus, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: B.warningLight, text: B.warning, icon: Clock, label: 'Pending' },
  confirmed: { bg: B.infoLight, text: B.info, icon: CheckCircle2, label: 'Confirmed' },
  processing: { bg: B.infoLight, text: B.info, icon: Loader, label: 'Processing' },
  shipped: { bg: B.purpleLight, text: B.purple, icon: Truck, label: 'Shipped' },
  out_for_delivery: { bg: B.purpleLight, text: B.purple, icon: Truck, label: 'Out for Delivery' },
  delivered: { bg: B.successLight, text: B.success, icon: CheckCircle2, label: 'Delivered' },
  cancelled: { bg: B.errorLight, text: B.error, icon: XCircle, label: 'Cancelled' },
  returned: { bg: B.warningLight, text: B.warning, icon: XCircle, label: 'Returned' },
  refunded: { bg: B.bg, text: B.textMuted, icon: XCircle, label: 'Refunded' },
};

const filters: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
  { key: 'refunded', label: 'Refunded' },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const BrandOrdersScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, statusFilter, loading, error } = useAppSelector(selectBrandOrders);

  // Tabs stay mounted, so a mount-only fetch left this list showing what
  // was true when the app started — a status changed elsewhere never landed.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBrandOrders());
    }, [dispatch])
  );

  const filteredOrders = useMemo(() => {
    return statusFilter === 'all' ? orders : orders.filter((order) => order.orderStatus === statusFilter);
  }, [orders, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.orderStatus] = (counts[o.orderStatus] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const renderOrder = ({ item: order }: { item: typeof orders[0] }) => {
    const statusInfo = STATUS_MAP[order.orderStatus] || STATUS_MAP.pending;
    const StatusIcon = statusInfo.icon;
    const customerName = order.shippingAddress.fullName;
    const initials = getInitials(customerName);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.6}
        onPress={() => navigation.navigate(BrandRouteNames.BrandOrderDetail, { orderId: order.orderId })}
      >
        <View style={styles.cardTop}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.orderId}>{order.orderId}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
            <StatusIcon size={12} stroke={statusInfo.text} strokeWidth={2} />
            <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.orderDetail}>
            <Text style={styles.detailLabel}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Text>
            <Text style={styles.detailDot}>·</Text>
            <Text style={styles.detailLabel}>{order.paymentMethod}</Text>
          </View>
          <View style={styles.cardBottomRight}>
            <Text style={styles.total}>₨{order.total.toLocaleString()}</Text>
            <ChevronRight size={16} stroke={B.textMuted} strokeWidth={2} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      {/* Header */}
      <BrandHeader
        title="Orders"
        subtitle={`${orders.length} total`}
        showBack
        actions={
          <BrandHeaderAction onPress={() => navigation.navigate(BrandRouteNames.BrandReturnRequests)}>
            <TriangleAlert size={17} stroke={B.warning} strokeWidth={2} />
          </BrandHeaderAction>
        }
      />

      {/* Filters */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersRow}
          renderItem={({ item }) => {
            const active = statusFilter === item.key;
            const count = filterCounts[item.key] || 0;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => dispatch(setStatusFilter(item.key))}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                {count > 0 && (
                  <View style={[styles.filterCount, active && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Order List */}
      {loading && orders.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Couldn't load orders</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => dispatch(fetchBrandOrders())}>
            <RefreshCw size={14} stroke="#FFF" strokeWidth={2} />
            <Text style={styles.refreshText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.orderId}
          renderItem={renderOrder}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <ClipboardList size={32} stroke={B.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>There are no orders matching this filter.</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => dispatch(setStatusFilter('all'))}>
                <RefreshCw size={14} stroke="#FFF" strokeWidth={2} />
                <Text style={styles.refreshText}>Show All Orders</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },

  // Filters
  filterSection: {
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  filtersRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: B.bg,
    borderWidth: 1,
    borderColor: B.border,
  },
  filterChipActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  filterText: { fontSize: 12, fontWeight: '700', color: B.textSec },
  filterTextActive: { color: '#FFF' },
  filterCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.border,
    paddingHorizontal: 5,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: { fontSize: 10, fontWeight: '800', color: B.textSec },
  filterCountTextActive: { color: '#FFF' },

  // Content
  content: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.accent,
  },
  cardMid: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '700', color: B.text },
  orderId: { fontSize: 12, color: B.textMuted, marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDivider: {
    height: 1,
    backgroundColor: B.border,
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: { fontSize: 12, color: B.textMuted },
  detailDot: { fontSize: 12, color: B.textMuted },
  cardBottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  total: { fontSize: 15, fontWeight: '800', color: B.text },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: B.text },
  emptyText: { fontSize: 13, color: B.textMuted, textAlign: 'center', maxWidth: 240 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.accent,
  },
  refreshText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default BrandOrdersScreen;