import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ClipboardList, ExternalLink, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectBrandOrders, setStatusFilter } from './brandOrdersSlice';

const filters: { key: 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const BrandOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, statusFilter } = useAppSelector(selectBrandOrders);

  const filteredOrders = useMemo(() => {
    return statusFilter === 'all' ? orders : orders.filter((order) => order.orderStatus === statusFilter);
  }, [orders, statusFilter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate(BrandRouteNames.BrandReturnRequests)}>
          <TriangleAlert size={20} stroke={Colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {filters.map((filter) => {
          const active = statusFilter === filter.key;
          return (
            <TouchableOpacity key={filter.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => dispatch(setStatusFilter(filter.key))}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredOrders.map((order) => {
          const firstItem = order.items[0];
          return (
            <TouchableOpacity key={order.orderId} style={styles.card} onPress={() => navigation.navigate(BrandRouteNames.BrandOrderDetail, { orderId: order.orderId })}>
              <Image source={{ uri: firstItem.productImage }} style={styles.image} />
              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <Text style={styles.orderId}>{order.orderId}</Text>
                  <Text style={styles.statusTag}>{order.orderStatus.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.customer}>{order.shippingAddress.fullName}</Text>
                <Text style={styles.meta}>{order.items.length} item(s) · {order.paymentMethod}</Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.total}>PKR {order.total.toLocaleString()}</Text>
                  <View style={styles.linkRow}>
                    <Text style={styles.linkText}>Process</Text>
                    <ExternalLink size={14} stroke={Colors.primary} strokeWidth={2} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <ClipboardList size={28} stroke={Colors.text.tertiary} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No orders in this status</Text>
            <Text style={styles.emptyText}>Try another filter or refresh your order list.</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => dispatch(setStatusFilter('all'))}>
              <RefreshCw size={14} stroke="#FFF" strokeWidth={2} />
              <Text style={styles.refreshText}>Show all</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  filtersRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, ...Shadows.sm },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  filterTextActive: { color: '#FFF' },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: { marginBottom: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, overflow: 'hidden', ...Shadows.sm },
  image: { width: '100%', height: 150, backgroundColor: Colors.backgroundAlt },
  cardBody: { padding: Spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderId: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  statusTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.primaryMuted, color: Colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  customer: { marginTop: 4, fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  meta: { marginTop: 4, fontSize: 12, color: Colors.text.tertiary },
  total: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  emptyText: { fontSize: 12, color: Colors.text.secondary, textAlign: 'center' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  refreshText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});

export default BrandOrdersScreen;