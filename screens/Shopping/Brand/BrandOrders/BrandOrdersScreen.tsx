import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
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
import { selectBrandOrders, setStatusFilter } from './brandOrdersSlice';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryLight: '#FFF5EB',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
};

const STATUS_MAP: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: B.warningLight, text: B.warning, icon: Clock, label: 'Pending' },
  processing: { bg: B.infoLight, text: B.info, icon: Loader, label: 'Processing' },
  shipped: { bg: B.purpleLight, text: B.purple, icon: Truck, label: 'Shipped' },
  delivered: { bg: B.successLight, text: B.success, icon: CheckCircle2, label: 'Delivered' },
  cancelled: { bg: B.errorLight, text: B.error, icon: XCircle, label: 'Cancelled' },
};

const filters: { key: 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const BrandOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, statusFilter } = useAppSelector(selectBrandOrders);

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.countLabel}>{orders.length} total</Text>
        </View>
        <TouchableOpacity style={styles.returnsBtn} onPress={() => navigation.navigate(BrandRouteNames.BrandReturnRequests)}>
          <TriangleAlert size={16} stroke={B.warning} strokeWidth={2} />
        </TouchableOpacity>
      </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_H + 10,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: B.text },
  countLabel: { fontSize: 12, fontWeight: '600', color: B.textMuted, marginTop: 1 },
  returnsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.warningLight,
  },

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
    backgroundColor: B.primary,
    borderColor: B.primary,
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
    backgroundColor: B.primaryLight,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: B.primary,
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
    backgroundColor: B.primary,
  },
  refreshText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default BrandOrdersScreen;