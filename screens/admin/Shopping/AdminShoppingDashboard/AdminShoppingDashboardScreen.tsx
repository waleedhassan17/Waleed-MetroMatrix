// ============================================================================
// Shopping hub — the entry to everything shopping in the console.
//
// Figures from GET /api/shopping/admin/dashboard ("today" in Pakistan time);
// each opens the list that deals with it. Nothing is drawn until the server
// has answered, so a failed load reads as "couldn't load", not as zeros.
// "Order value" is what customers paid brands — the platform takes no share.
// ============================================================================

import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, KpiGrid, KpiTile, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { ListRow } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { useGetShopDashboardQuery } from '../../../../networks/admin/shoppingApi';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { formatCount } from '../../../../utils/admin/format';

const LINKS: { label: string; route: string; icon: string; subtitle: string }[] = [
  { label: 'Brands', route: AdminShoppingRouteNames.AdminBrandList, icon: 'storefront-outline', subtitle: 'Approval, status and storefront details' },
  { label: 'Product moderation', route: AdminShoppingRouteNames.AdminProductModeration, icon: 'shield-checkmark-outline', subtitle: 'What customers can see' },
  { label: 'Orders', route: AdminShoppingRouteNames.AdminShoppingOrders, icon: 'receipt-outline', subtitle: 'Status, refunds and history' },
  { label: 'Analytics', route: AdminShoppingRouteNames.AdminShoppingAnalytics, icon: 'bar-chart-outline', subtitle: 'Order value, brands and products over time' },
  { label: 'Outlets', route: AdminShoppingRouteNames.AdminOutletList, icon: 'business-outline', subtitle: 'Physical stores' },
  { label: 'Promo banners', route: AdminShoppingRouteNames.AdminBannerList, icon: 'images-outline', subtitle: 'The storefront carousel' },
  { label: 'Settings', route: AdminShoppingRouteNames.AdminShoppingSettings, icon: 'settings-outline', subtitle: 'Shipping, returns, delivery options and approval' },
];

export default function AdminShoppingDashboardScreen() {
  const navigation = useNavigation<any>();
  const dash = useGetShopDashboardQuery();
  const d = dash.data;

  return (
    <AdminScreen title="Shopping" refreshing={dash.isFetching && !dash.isLoading} onRefresh={dash.refetch}>
      <PermissionGate all={['canManageShopping']} action="manage shopping">
        <Section title="Needs attention">
          <QueryState isLoading={dash.isLoading} error={dash.error} onRetry={dash.refetch} skeletonCount={1}>
            {d && (
              <KpiGrid>
                <KpiTile
                  label="Brands awaiting approval"
                  value={formatCount(d.pendingBrandApprovals)}
                  caption="Now"
                  tone={d.pendingBrandApprovals ? 'warning' : 'neutral'}
                  onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminBrandList)}
                />
                <KpiTile
                  label="Open return requests"
                  value={formatCount(d.openReturnRequests)}
                  caption="Brands decide; refunds come here"
                  tone={d.openReturnRequests ? 'warning' : 'neutral'}
                  onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminShoppingOrders)}
                />
                <KpiTile
                  label="Low-stock alerts"
                  value={formatCount(d.lowStockAlerts)}
                  caption="Variants at or below the threshold"
                  tone={d.lowStockAlerts ? 'warning' : 'neutral'}
                  onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminBrandList)}
                />
              </KpiGrid>
            )}
          </QueryState>
        </Section>

        {d && (
          <Section title="Today">
            <KpiGrid>
              <KpiTile label="Orders" value={formatCount(d.ordersToday)} caption="Placed today" onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminShoppingOrders)} />
              <KpiTile label="Order value" value={formatMoney(d.gmvToday)} caption="Placed today, not cancelled" onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminShoppingAnalytics)} />
            </KpiGrid>
          </Section>
        )}

        <Section title="Manage" card>
          {LINKS.map((link, i) => (
            <ListRow
              key={link.route}
              title={link.label}
              subtitle={link.subtitle}
              icon={link.icon}
              onPress={() => navigation.navigate(link.route)}
              divider={i < LINKS.length - 1}
            />
          ))}
        </Section>
      </PermissionGate>
    </AdminScreen>
  );
}
