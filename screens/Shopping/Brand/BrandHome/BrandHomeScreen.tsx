import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart3, Boxes, ShoppingBag, TriangleAlert, Wallet } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppSelector } from '../../../../store/hooks';
import { selectBrandHome } from './brandHomeSlice';
import { selectBalance, selectCurrency } from '../../../user/wallet/walletSlice';

const BrandHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { kpis, weeklySales, recentOrders, lowStockAlerts } = useAppSelector(selectBrandHome);
  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;
  const currencySym = walletCurrency.toLowerCase() === 'pkr' ? '₨' : '$';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Brand dashboard</Text>
          <Text style={styles.title}>Manage orders, inventory, and growth from one place.</Text>
          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate(BrandRouteNames.BrandOrders)}>
              <ShoppingBag size={16} stroke="#FFF" strokeWidth={2} />
              <Text style={styles.primaryBtnText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate(BrandRouteNames.BrandReturnRequests)}>
              <TriangleAlert size={16} stroke={Colors.primary} strokeWidth={2} />
              <Text style={styles.secondaryBtnText}>Returns</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet balance banner */}
        <TouchableOpacity
          style={styles.walletBanner}
          onPress={() => navigation.navigate('Wallet' as never)}
          activeOpacity={0.85}
        >
          <View style={styles.walletBannerLeft}>
            <Wallet size={16} stroke={Colors.primary} strokeWidth={2} />
            <View>
              <Text style={styles.walletBannerLabel}>Earnings Wallet</Text>
              <Text style={styles.walletBannerBalance}>{currencySym}{walletBalance.toFixed(2)} {walletCurrency.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.walletBannerCta}>View →</Text>
        </TouchableOpacity>

        <View style={styles.kpiGrid}>
          {[
            { label: 'Revenue', value: `PKR ${kpis.revenue.toLocaleString()}`, icon: BarChart3 },
            { label: 'Orders', value: String(kpis.orders), icon: ShoppingBag },
            { label: 'Products', value: String(kpis.products), icon: Boxes },
            { label: 'Low stock', value: String(kpis.lowStock), icon: TriangleAlert },
          ].map((item) => (
            <View key={item.label} style={styles.kpiCard}>
              <View style={styles.kpiIcon}><item.icon size={16} stroke={Colors.primary} strokeWidth={2} /></View>
              <Text style={styles.kpiValue}>{item.value}</Text>
              <Text style={styles.kpiLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Weekly sales</Text>
          <View style={styles.chartRow}>
            {weeklySales.map((value, index) => (
              <View key={`${index}-${value}`} style={styles.chartColumn}>
                <View style={[styles.chartBar, { height: 60 + value * 4 }]} />
                <Text style={styles.chartLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Recent orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate(BrandRouteNames.BrandOrders)}>
              <Text style={styles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.map((order) => (
            <View key={order.orderId} style={styles.rowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{order.customerName}</Text>
                <Text style={styles.rowSubtitle}>{order.orderId} · {order.createdAt}</Text>
              </View>
              <Text style={styles.rowMeta}>PKR {order.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Low stock alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate(BrandRouteNames.BrandInventory)}>
              <Text style={styles.linkText}>Inventory</Text>
            </TouchableOpacity>
          </View>
          {lowStockAlerts.map((item) => (
            <View key={item.productId} style={styles.rowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>Product {item.productId}</Text>
              </View>
              <Text style={styles.rowMeta}>{item.stock} left</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  hero: { padding: Spacing.lg, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  eyebrow: { fontSize: 12, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { marginTop: Spacing.sm, fontSize: 24, fontWeight: '800', color: Colors.text.primary, lineHeight: 32 },
  heroRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  primaryBtnText: { color: '#FFF', fontWeight: '800' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.primaryMuted },
  secondaryBtnText: { color: Colors.primary, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  kpiCard: { width: '48%', padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, ...Shadows.sm },
  kpiIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryMuted, marginBottom: Spacing.sm },
  kpiValue: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  kpiLabel: { marginTop: 2, fontSize: 12, color: Colors.text.secondary },
  panel: { marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, ...Shadows.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  panelTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  linkText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.md },
  chartColumn: { alignItems: 'center', flex: 1 },
  chartBar: { width: 18, borderRadius: 999, backgroundColor: Colors.primary, marginBottom: 6 },
  chartLabel: { fontSize: 11, color: Colors.text.secondary },
  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  rowTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  rowSubtitle: { marginTop: 2, fontSize: 12, color: Colors.text.secondary },
  rowMeta: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  walletBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.lg, padding: Spacing.md,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.primaryMuted,
    borderWidth: 1, borderColor: 'rgba(230,126,34,0.2)',
  },
  walletBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  walletBannerLabel: { fontSize: 11, color: Colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  walletBannerBalance: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginTop: 2 },
  walletBannerCta: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});

export default BrandHomeScreen;