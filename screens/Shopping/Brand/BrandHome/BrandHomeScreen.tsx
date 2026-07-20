import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
  Truck,
  Wallet,
  Warehouse,
} from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchBrandDashboard, selectBrandHome } from './brandHomeSlice';
import { fetchMyBrand, selectBrandProfile } from '../BrandProfile/brandProfileSlice';
import { selectBalance, selectCurrency } from '../../../../services/wallet';
import MiniWalletCard from '../../../../components/MiniWalletCard/MiniWalletCard';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF5EB',
  primaryMuted: 'rgba(230,126,34,0.08)',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#D97706' },
  processing: { bg: '#DBEAFE', text: '#2563EB' },
  shipped: { bg: '#E0E7FF', text: '#4F46E5' },
  delivered: { bg: '#ECFDF5', text: '#059669' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

const BrandHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { kpis, weeklySales, recentOrders, lowStockAlerts, loading, error } = useAppSelector(selectBrandHome);
  const { brand } = useAppSelector(selectBrandProfile);

  useEffect(() => {
    dispatch(fetchBrandDashboard());
    dispatch(fetchMyBrand());
  }, [dispatch]);
  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;
  const currencySym = walletCurrency.toLowerCase() === 'pkr' ? '₨' : '$';

  const maxSale = Math.max(...weeklySales, 1);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const quickActions = [
    { label: 'Products', icon: Package, route: BrandRouteNames.BrandProducts, color: B.primary },
    { label: 'Orders', icon: ClipboardList, route: BrandRouteNames.BrandOrders, color: B.info },
    { label: 'Inventory', icon: Warehouse, route: BrandRouteNames.BrandInventory, color: '#8B5CF6' },
    { label: 'Analytics', icon: BarChart3, route: BrandRouteNames.BrandAnalytics, color: B.success },
    { label: 'Deliveries', icon: Truck, route: BrandRouteNames.BrandDeliveries, color: '#F59E0B' },
    { label: 'Add Product', icon: Plus, route: BrandRouteNames.AddProduct, color: '#EC4899' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandLabel}>{brand?.name ? brand.name.toUpperCase() : ' '}</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.walletChip}
          onPress={() => navigation.navigate('WalletScreen' as never)}
          activeOpacity={0.7}
        >
          <Wallet size={14} stroke={B.primary} strokeWidth={2} />
          <Text style={styles.walletChipText}>
            {currencySym}{walletBalance.toFixed(0)}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet — one component, one data source, everywhere (W2 Part 4).
            The header chip above reads the SAME selectBalance/selectCurrency,
            resolved from THIS vendor's own JWT — independent from every
            other provider's balance. */}
        <MiniWalletCard onPress={() => navigation.navigate('WalletScreen' as never)} />

        {loading && kpis.orders === 0 && recentOrders.length === 0 && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={B.primary} />
          </View>
        )}
        {error && (
          <View style={styles.dashboardErrorCard}>
            <Text style={styles.dashboardErrorText}>{error}</Text>
            <TouchableOpacity onPress={() => dispatch(fetchBrandDashboard())}>
              <Text style={styles.dashboardRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── KPI Cards ── */}
        <View style={styles.kpiRow}>
          {[
            { label: 'Revenue', value: `₨${(kpis.revenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: B.primary, bg: B.primaryLight },
            { label: 'Income', value: `₨${(kpis.income / 1000).toFixed(0)}K`, icon: Wallet, color: B.success, bg: B.successLight },
            { label: 'Orders', value: String(kpis.orders), icon: ShoppingBag, color: B.info, bg: '#EFF6FF' },
            { label: 'Shipments', value: String(kpis.activeShipments), icon: Truck, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Delivery %', value: `${kpis.deliveryRate}%`, icon: Boxes, color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Low Stock', value: String(kpis.lowStock), icon: TriangleAlert, color: kpis.lowStock > 0 ? B.error : B.success, bg: kpis.lowStock > 0 ? B.errorLight : B.successLight },
          ].map((item) => (
            <View key={item.label} style={styles.kpiCard}>
              <View style={[styles.kpiIconWrap, { backgroundColor: item.bg }]}>
                <item.icon size={16} stroke={item.color} strokeWidth={2} />
              </View>
              <Text style={styles.kpiValue}>{item.value}</Text>
              <Text style={styles.kpiLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(action.route)}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}12` }]}>
                <action.icon size={18} stroke={action.color} strokeWidth={2} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Weekly Sales Chart ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Sales</Text>
          </View>
          <View style={styles.chartContainer}>
            {weeklySales.map((value, index) => {
              const barH = Math.max(8, (value / maxSale) * 120);
              const isMax = value === maxSale;
              return (
                <View key={`${index}`} style={styles.chartCol}>
                  <Text style={styles.chartValue}>{value}</Text>
                  <View
                    style={[
                      styles.chartBar,
                      { height: barH, backgroundColor: isMax ? B.primary : `${B.primary}40` },
                    ]}
                  />
                  <Text style={[styles.chartDay, isMax && { color: B.primary, fontWeight: '700' }]}>
                    {dayLabels[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Recent Orders ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Orders</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate(BrandRouteNames.BrandOrders)}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} stroke={B.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {recentOrders.map((order, idx) => {
            const statusStyle = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.pending;
            return (
              <TouchableOpacity
                key={order.orderId}
                style={[styles.orderRow, idx < recentOrders.length - 1 && styles.orderRowBorder]}
                activeOpacity={0.6}
                onPress={() => navigation.navigate(BrandRouteNames.BrandOrderDetail, { orderId: order.orderId })}
              >
                <View style={styles.orderLeft}>
                  <Text style={styles.orderCustomer}>{order.customerName}</Text>
                  <Text style={styles.orderMeta}>{order.orderId} · {order.createdAt}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>₨{order.total.toLocaleString()}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {order.orderStatus}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Low Stock Alerts ── */}
        {lowStockAlerts.length > 0 && (
          <View style={[styles.card, styles.alertCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.alertTitleRow}>
                <TriangleAlert size={16} stroke={B.error} strokeWidth={2} />
                <Text style={[styles.cardTitle, { color: B.error }]}>Low Stock Alerts</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate(BrandRouteNames.BrandInventory)}
              >
                <Text style={styles.viewAllText}>Manage</Text>
                <ChevronRight size={14} stroke={B.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {lowStockAlerts.map((item, idx) => (
              <View
                key={item.productId}
                style={[styles.alertRow, idx < lowStockAlerts.length - 1 && styles.orderRowBorder]}
              >
                <View style={styles.alertDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertName}>{item.name}</Text>
                  <Text style={styles.alertSku}>{item.productId}</Text>
                </View>
                <View style={styles.stockBadge}>
                  <Text style={styles.stockBadgeText}>{item.stock} left</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Return Requests CTA ── */}
        <TouchableOpacity
          style={styles.returnsCta}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(BrandRouteNames.BrandReturnRequests)}
        >
          <View style={styles.returnsCtaLeft}>
            <View style={styles.returnsCtaIcon}>
              <TriangleAlert size={16} stroke="#D97706" strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.returnsCtaTitle}>Return Requests</Text>
              <Text style={styles.returnsCtaDesc}>Review and manage customer returns</Text>
            </View>
          </View>
          <ChevronRight size={18} stroke={B.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_H + 12,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: B.primary,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: B.text,
    marginTop: 2,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: B.primaryLight,
    borderWidth: 1,
    borderColor: `${B.primary}20`,
  },
  walletChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: B.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '31%' as any,
    padding: 12,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: B.text,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: B.textMuted,
    marginTop: 2,
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  actionCard: {
    width: '31%' as any,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: B.textSec,
  },

  // Shared Card
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: B.text,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: B.primary,
  },
  loaderWrap: { paddingVertical: Spacing.lg, alignItems: 'center' },
  dashboardErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: B.errorLight,
    marginBottom: Spacing.md,
  },
  dashboardErrorText: { flex: 1, fontSize: 12, color: B.error, fontWeight: '600' },
  dashboardRetryText: { fontSize: 12, fontWeight: '700', color: B.error, marginLeft: Spacing.sm },

  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: 10,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '700',
    color: B.textMuted,
    marginBottom: 4,
  },
  chartBar: {
    width: 22,
    borderRadius: 6,
    marginBottom: 6,
  },
  chartDay: {
    fontSize: 11,
    fontWeight: '600',
    color: B.textMuted,
  },

  // Orders
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  orderLeft: { flex: 1 },
  orderCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: B.text,
  },
  orderMeta: {
    fontSize: 12,
    color: B.textMuted,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: B.text,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Alert Card
  alertCard: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: B.error,
  },
  alertName: {
    fontSize: 13,
    fontWeight: '700',
    color: B.text,
  },
  alertSku: {
    fontSize: 11,
    color: B.textMuted,
    marginTop: 1,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: B.errorLight,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: B.error,
  },

  // Returns CTA
  returnsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  returnsCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  returnsCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  returnsCtaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: B.text,
  },
  returnsCtaDesc: {
    fontSize: 12,
    color: B.textMuted,
    marginTop: 1,
  },
});

export default BrandHomeScreen;