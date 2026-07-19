import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchMyOrders, selectMyOrders, setStatusFilter } from './myOrdersSlice';

const filters = ['all', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const MyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, statusFilter } = useAppSelector(selectMyOrders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  const filtered = useMemo(() => (statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)), [orders, statusFilter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}><ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((filter) => {
          const active = statusFilter === filter;
          return (
            <TouchableOpacity key={filter} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => dispatch(setStatusFilter(filter))}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((order) => (
          <TouchableOpacity key={order.orderId} style={styles.card} onPress={() => navigation.navigate(ShoppingRouteNames.OrderDetail, { orderId: order.orderId })}>
            <Text style={styles.orderId}>{order.orderId}</Text>
            <Text style={styles.orderTitle}>{order.title}</Text>
            <Text style={styles.meta}>{order.status} · {order.createdAt}</Text>
            <Text style={styles.total}>PKR {order.total.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && <View style={styles.empty}><ClipboardList size={28} stroke={Colors.text.tertiary} strokeWidth={2} /><Text style={styles.emptyTitle}>No orders found</Text></View>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, ...Shadows.sm },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  filterTextActive: { color: '#FFF' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: { marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  orderId: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  orderTitle: { marginTop: 4, fontSize: 14, fontWeight: '700', color: Colors.text.secondary },
  meta: { marginTop: 4, fontSize: 12, color: Colors.text.tertiary },
  total: { marginTop: 8, fontSize: 14, fontWeight: '800', color: Colors.primary },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
});

export default MyOrdersScreen;