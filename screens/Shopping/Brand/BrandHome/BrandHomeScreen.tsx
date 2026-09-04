import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { B, statusTone, humanizeStatus, formatOrderNumber } from '../theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { C, F, T } from '../../../../constants/theme';

const BrandHomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { kpis, weeklySales, recentOrders, lowStockAlerts, loading, error } = useAppSelector(selectBrandHome);
  const { brand } = useAppSelector(selectBrandProfile);

  useEffect(() => {
    dispatch(fetchMyBrand());
  }, [dispatch]);

  // Refetch on focus, not just on mount. This is a tab, so it stays mounted:
  // after marking an order delivered on the Orders tab, coming back here still
  // showed the status the dashboard had loaded when the app started.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBrandDashboard());
    }, [dispatch])
  );

  // The API returns one low-stock row per variant, so a product low in three
  // sizes arrived three times — identical-looking rows, and three React
  // children sharing the product's id as a key. Collapse to one row per
  // product, carrying the worst stock level and how many variants are low.
  const lowStockByProduct = useMemo(() => {
    const byProduct = new Map<string, { productId: string; name: string; stock: number; variants: number }>();
    lowStockAlerts.forEach((item) => {
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.stock = Math.min(existing.stock, item.stock);
        existing.variants += 1;
      } else {
        byProduct.set(item.productId, { ...item, variants: 1 });
      }
    });
    return Array.from(byProduct.values()).sort((a, b) => a.stock - b.stock);
  }, [lowStockAlerts]);
  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;
  const currencySym = walletCurrency.toLowerCase() === 'pkr' ? '₨' : '$';

  const maxSale = Math.max(...weeklySales, 1);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const quickActions = [
    { label: 'Products', icon: Package, route: BrandRouteNames.BrandProducts, color: colors.accent },
    { label: 'Orders', icon: ClipboardList, route: BrandRouteNames.BrandOrders, color: B.info },
    { label: 'Inventory', icon: Warehouse, route: BrandRouteNames.BrandInventory, color: C.info },
    { label: 'Analytics', icon: BarChart3, route: BrandRouteNames.BrandAnalytics, color: B.success },
    { label: 'Deliveries', icon: Truck, route: BrandRouteNames.BrandDeliveries, color: C.warning },
    { label: 'Add Product', icon: Plus, route: BrandRouteNames.AddProduct, color: colors.accentDeep },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.bg} />

      {/* ── Header ──
          Identity first: the store's mark and name carry the brand, with
          "Dashboard" as the section beneath. The old header led with a
          letter-spaced all-caps name and no mark, so nothing tied the screen
          to the store it belongs to. */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIdentity}>
          {brand?.logo ? (
            <Image source={{ uri: brand.logo }} style={styles.brandMark} />
          ) : (
            <View style={[styles.brandMark, styles.brandMarkFallback]}>
              <Text style={styles.brandMarkText}>
                {brand?.name?.trim()?.[0]?.toUpperCase() ?? 'B'}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>Dashboard</Text>
            <Text style={styles.brandLabel} numberOfLines={1}>
              {brand?.name ?? 'Your store'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.walletChip}
          onPress={() => navigation.navigate('WalletScreen' as never)}
          activeOpacity={0.7}
        >
          <Wallet size={13} stroke={colors.accent} strokeWidth={2} />
          <Text style={styles.walletChipText}>
            {currencySym}{walletBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
            <ActivityIndicator size="small" color={colors.accent} />
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
            { label: 'Revenue', value: `₨${(kpis.revenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: colors.accent, bg: colors.accentSoft },
            { label: 'Income', value: `₨${(kpis.income / 1000).toFixed(0)}K`, icon: Wallet, color: B.success, bg: B.successLight },
            { label: 'Orders', value: String(kpis.orders), icon: ShoppingBag, color: B.info, bg: C.infoSoft },
            { label: 'Shipments', value: String(kpis.activeShipments), icon: Truck, color: C.warning, bg: C.warningSoft },
            { label: 'Delivery %', value: `${kpis.deliveryRate}%`, icon: Boxes, color: C.info, bg: C.infoSoft },
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
                      { height: barH, backgroundColor: isMax ? colors.accent : `${colors.accent}40` },
                    ]}
                  />
                  <Text style={[styles.chartDay, isMax && { color: colors.accent, fontFamily: F.bold }]}>
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
              <ChevronRight size={14} stroke={colors.accent} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {recentOrders.map((order, idx) => {
            const statusStyle = statusTone(order.orderStatus);
            return (
              <TouchableOpacity
                key={order.orderId}
                style={[styles.orderRow, idx < recentOrders.length - 1 && styles.orderRowBorder]}
                activeOpacity={0.6}
                onPress={() => navigation.navigate(BrandRouteNames.BrandOrderDetail, { orderId: order.orderId })}
              >
                <View style={styles.orderLeft}>
                  <Text style={styles.orderCustomer} numberOfLines={1}>{order.customerName}</Text>
                  {/* The full order id ran the row off the edge — vendors
                      quote the short number, same as the customer sees. */}
                  <Text style={styles.orderMeta} numberOfLines={1}>
                    {formatOrderNumber(order.odexId || order.orderId)} · {order.createdAt}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>₨{order.total.toLocaleString()}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {humanizeStatus(order.orderStatus)}
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
                <ChevronRight size={14} stroke={colors.accent} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {lowStockByProduct.map((item, idx) => (
              <View
                key={item.productId}
                style={[styles.alertRow, idx < lowStockByProduct.length - 1 && styles.orderRowBorder]}
              >
                <View style={styles.alertDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertName} numberOfLines={1}>{item.name}</Text>
                  {/* Was the raw productId — a Mongo id passed off as a SKU.
                      Which variants are short is the useful detail. */}
                  <Text style={styles.alertSku}>
                    {item.variants > 1 ? `${item.variants} variants low` : 'Running low'}
                  </Text>
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
              <TriangleAlert size={16} stroke={C.warning} strokeWidth={2} />
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

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: c.accentSoft,
  },
  brandMarkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${c.accent}33`,
  },
  brandMarkText: {
    ...T.subhead,
    fontFamily: F.bold,
    color: c.accent,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...T.heading,
    fontFamily: F.bold,
    color: B.text,
    letterSpacing: -0.4,
  },
  brandLabel: {
    ...T.caption,
    fontFamily: F.semibold,
    color: B.textMuted,
    marginTop: 1,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: c.accentSoft,
    borderWidth: 1,
    borderColor: `${c.accent}20`,
    flexShrink: 0,
  },
  walletChipText: {
    ...T.label,
    fontFamily: F.bold,
    color: c.accent,
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
    ...T.subhead,
    fontFamily: F.bold,
    color: B.text,
  },
  kpiLabel: {
    ...T.caption,
    fontFamily: F.semibold,
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
    ...T.caption,
    fontFamily: F.bold,
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
    ...T.subhead,
    fontFamily: F.bold,
    color: B.text,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...T.caption,
    fontFamily: F.bold,
    color: c.accent,
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
  dashboardErrorText: { flex: 1, ...T.caption, fontFamily: F.semibold, color: B.error },
  dashboardRetryText: { ...T.caption, fontFamily: F.bold, color: B.error, marginLeft: Spacing.sm },

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
    ...T.caption,
    fontFamily: F.bold,
    color: B.textMuted,
    marginBottom: 4,
  },
  chartBar: {
    width: 22,
    borderRadius: 6,
    marginBottom: 6,
  },
  chartDay: {
    ...T.caption,
    fontFamily: F.semibold,
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
    ...T.body,
    fontFamily: F.bold,
    color: B.text,
  },
  orderMeta: {
    ...T.caption,

    color: B.textMuted,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderTotal: {
    ...T.body,
    fontFamily: F.bold,
    color: B.text,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    ...T.caption,
    fontFamily: F.bold,
    textTransform: 'capitalize',
  },

  // Alert Card
  alertCard: {
    borderWidth: 1,
    borderColor: C.errorSoft,
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
    ...T.label,
    fontFamily: F.bold,
    color: B.text,
  },
  alertSku: {
    ...T.caption,

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
    ...T.caption,
    fontFamily: F.bold,
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
    backgroundColor: C.warningSoft,
    borderWidth: 1,
    borderColor: C.warningSoft,
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
    backgroundColor: C.warningSoft,
  },
  returnsCtaTitle: {
    ...T.body,
    fontFamily: F.bold,
    color: B.text,
  },
  returnsCtaDesc: {
    ...T.caption,

    color: B.textMuted,
    marginTop: 1,
  },
});

export default BrandHomeScreen;