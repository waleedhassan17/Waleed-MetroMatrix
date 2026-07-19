import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  Store,
  ClipboardList,
  Banknote,
  RotateCcw,
  TriangleAlert,
  BarChart3,
  Settings,
  Warehouse,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import {
  fetchAdminShoppingDashboard,
  selectAdminShoppingDashboard,
} from './adminShoppingDashboardSlice';

const COLORS = {
  primary: '#E67E22',
  primaryLight: '#FFF3E6',
  success: '#27AE60',
  danger: '#E74C3C',
  info: '#3B82F6',
  warn: '#F59E0B',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};
const CURRENCY = 'PKR';

const AdminShoppingDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(selectAdminShoppingDashboard);

  const load = useCallback(() => {
    dispatch(fetchAdminShoppingDashboard());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    {
      key: 'pending',
      label: 'Pending brand approvals',
      value: data?.pendingBrandApprovals ?? 0,
      icon: <Store size={20} stroke={COLORS.warn} strokeWidth={2} />,
      onPress: () => navigation.navigate(AdminShoppingRouteNames.AdminBrandList),
    },
    {
      key: 'orders',
      label: 'Orders today',
      value: data?.ordersToday ?? 0,
      icon: <ClipboardList size={20} stroke={COLORS.info} strokeWidth={2} />,
      onPress: () => navigation.navigate(AdminShoppingRouteNames.AdminShoppingOrders),
    },
    {
      key: 'gmv',
      label: 'GMV today',
      value: `${CURRENCY} ${(data?.gmvToday ?? 0).toLocaleString()}`,
      icon: <Banknote size={20} stroke={COLORS.success} strokeWidth={2} />,
      onPress: () => navigation.navigate(AdminShoppingRouteNames.AdminShoppingAnalytics),
    },
    {
      key: 'returns',
      label: 'Open return requests',
      value: data?.openReturnRequests ?? 0,
      icon: <RotateCcw size={20} stroke={COLORS.primary} strokeWidth={2} />,
      onPress: () => navigation.navigate(AdminShoppingRouteNames.AdminShoppingOrders),
    },
    {
      key: 'lowstock',
      label: 'Low-stock alerts',
      value: data?.lowStockAlerts ?? 0,
      icon: <TriangleAlert size={20} stroke={COLORS.danger} strokeWidth={2} />,
      onPress: () => navigation.navigate(AdminShoppingRouteNames.AdminBrandList),
    },
  ];

  const links = [
    { label: 'Brand Management', route: AdminShoppingRouteNames.AdminBrandList, icon: <Store size={18} stroke={COLORS.primary} strokeWidth={2} /> },
    { label: 'All Orders', route: AdminShoppingRouteNames.AdminShoppingOrders, icon: <ClipboardList size={18} stroke={COLORS.primary} strokeWidth={2} /> },
    { label: 'Analytics', route: AdminShoppingRouteNames.AdminShoppingAnalytics, icon: <BarChart3 size={18} stroke={COLORS.primary} strokeWidth={2} /> },
    { label: 'Outlets', route: AdminShoppingRouteNames.AdminOutletList, icon: <Warehouse size={18} stroke={COLORS.primary} strokeWidth={2} /> },
    { label: 'Shopping Settings', route: AdminShoppingRouteNames.AdminShoppingSettings, icon: <Settings size={18} stroke={COLORS.primary} strokeWidth={2} /> },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Shopping Overview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={load} />}
      >
        {loading && !data && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />}
        {error && !data && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tileGrid}>
          {tiles.map((tile) => (
            <TouchableOpacity key={tile.key} style={styles.tile} onPress={tile.onPress}>
              <View style={styles.tileIcon}>{tile.icon}</View>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Manage</Text>
        {links.map((link) => (
          <TouchableOpacity
            key={link.label}
            style={styles.linkRow}
            onPress={() => navigation.navigate(link.route as never)}
          >
            <View style={styles.linkIcon}>{link.icon}</View>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <ChevronRight size={18} stroke={COLORS.textLight} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: 24 },
  errorText: { color: COLORS.textLight, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', backgroundColor: COLORS.card, borderRadius: 14, padding: 16, elevation: 1, borderWidth: 1, borderColor: COLORS.border },
  tileIcon: { marginBottom: 8 },
  tileValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  tileLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 24, marginBottom: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  linkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
});

export default AdminShoppingDashboardScreen;
