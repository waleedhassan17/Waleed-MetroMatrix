import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Search, ClipboardList } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import {
  fetchAdminOrders,
  selectAdminShoppingOrders,
  setPaymentFilter,
  setSearch,
  setStatusFilter,
} from './adminShoppingOrdersSlice';

const COLORS = {
  primary: '#E67E22',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};
const CURRENCY = 'PKR';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'];
const PAYMENT_FILTERS = ['all', 'pending', 'paid', 'refunded'];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  processing: '#8B5CF6',
  shipped: '#0EA5E9',
  out_for_delivery: '#06B6D4',
  delivered: '#27AE60',
  cancelled: '#E74C3C',
  returned: '#F97316',
  refunded: '#6B7280',
};

const AdminShoppingOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, statusFilter, paymentFilter, search, loading, error } =
    useAppSelector(selectAdminShoppingOrders);

  useEffect(() => {
    dispatch(fetchAdminOrders());
  }, [dispatch, statusFilter, paymentFilter]);

  const renderOrder = ({ item }: { item: (typeof orders)[number] }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminShoppingOrderDetail, { orderId: item.orderId })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.orderCode}>{item.odexId}</Text>
        <View style={[styles.chip, { backgroundColor: `${STATUS_COLORS[item.orderStatus] || '#999'}20` }]}>
          <Text style={[styles.chipText, { color: STATUS_COLORS[item.orderStatus] || '#999' }]}>
            {item.orderStatus.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>
      <Text style={styles.metaLine}>
        {item.brandName || 'Brand'} · {item.customerName || 'Customer'}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.payment}>
          {item.paymentMethod} · {item.paymentStatus}
        </Text>
        <Text style={styles.total}>{CURRENCY} {item.total.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>All Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <Search size={16} stroke={COLORS.textLight} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search order code or customer…"
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={(t) => dispatch(setSearch(t))}
          onSubmitEditing={() => dispatch(fetchAdminOrders())}
          returnKeyType="search"
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, statusFilter === f && styles.filterChipOn]}
              onPress={() => dispatch(setStatusFilter(f))}
            >
              <Text style={[styles.filterText, statusFilter === f && styles.filterTextOn]}>
                {f.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PAYMENT_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, paymentFilter === f && styles.filterChipOn]}
              onPress={() => dispatch(setPaymentFilter(f))}
            >
              <Text style={[styles.filterText, paymentFilter === f && styles.filterTextOn]}>
                pay: {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.orderId}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => dispatch(fetchAdminOrders())}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <ClipboardList size={40} stroke={COLORS.textLight} strokeWidth={1.5} />
              <Text style={styles.emptyText}>{error || 'No orders match these filters'}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  filterChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.card },
  filterChipOn: { backgroundColor: '#FFF3E6', borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, textTransform: 'capitalize' },
  filterTextOn: { color: COLORS.primary },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderCode: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metaLine: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  payment: { fontSize: 12, color: COLORS.textLight, textTransform: 'capitalize' },
  total: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textLight, marginTop: 10, textAlign: 'center' },
});

export default AdminShoppingOrdersScreen;
