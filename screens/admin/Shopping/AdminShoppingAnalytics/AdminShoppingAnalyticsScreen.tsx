// ============================================================================
// Shopping analytics — 7, 30 or 90 days, from GET /api/shopping/admin/analytics.
//
// Money here is what customers paid brands for DELIVERED orders ("order
// value"); the platform takes no share. Days are Pakistan calendar days. A
// brand's row opens the vendor who owns it.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, BarList, KpiGrid, KpiTile, PermissionGate, QueryState, Section, TrendChart } from '../../../../components/admin';
import { SegmentedControl } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { useGetShopAnalyticsQuery } from '../../../../networks/admin/shoppingApi';
import { formatCount, formatPercent } from '../../../../utils/admin/format';
import { S } from '../../../../theme';
import { openProvider } from '../../people/openProvider';
import { fillDays } from '../../homeservice/days';

type RangeKey = '7d' | '30d' | '90d';
const RANGES: { value: RangeKey; label: string; days: number }[] = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
];
const DAYS = Object.fromEntries(RANGES.map((r) => [r.value, r.days])) as Record<RangeKey, number>;
const DAY_MS = 86_400_000;

export default function AdminShoppingAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [range, setRange] = useState<RangeKey>('30d');
  const window = useMemo(() => {
    const to = new Date();
    return { from: new Date(to.getTime() - DAYS[range] * DAY_MS).toISOString(), to: to.toISOString() };
  }, [range]);
  const analytics = useGetShopAnalyticsQuery(window);
  const a = analytics.data;
  const caption = `Last ${RANGES.find((r) => r.value === range)?.label}`;
  const perDay = useMemo(() => (a ? fillDays(a.gmvSeries.map((p) => ({ date: p.label, count: p.gmv })), DAYS[range]) : []), [a, range]);

  return (
    <AdminScreen title="Shopping analytics" refreshing={analytics.isFetching && !analytics.isLoading} onRefresh={analytics.refetch}>
      <PermissionGate all={['canManageShopping']} action="see shopping analytics">
        <SegmentedControl options={RANGES} value={range} onChange={setRange} style={{ marginBottom: S.lg }} />
        <QueryState isLoading={analytics.isLoading} error={analytics.error} onRetry={analytics.refetch} skeleton="tiles" skeletonCount={4}>
          {a && (
            <>
              <Section title="Summary" caption={caption}>
                <KpiGrid>
                  <KpiTile label="Delivered order value" icon="cash-outline" value={formatMoney(a.gmv)} />
                  <KpiTile label="Orders" icon="receipt-outline" value={formatCount(a.totalOrders)} onPress={() => navigation.navigate('AdminShoppingOrders')} />
                  <KpiTile label="Average order" icon="calculator-outline" value={formatMoney(a.avgOrderValue)} />
                  <KpiTile label="New customers" icon="person-add-outline" value={formatCount(a.newCustomers)} />
                  <KpiTile label="Active brands" icon="storefront-outline" value={formatCount(a.activeBrands)} />
                  <KpiTile label="Returned" icon="return-down-back-outline" value={formatPercent(a.returnRate)} caption="Of orders" />
                </KpiGrid>
              </Section>

              <Section title="Order value over time" caption={`${caption}, delivered orders by the day they were placed`} card>
                <TrendChart data={perDay} unit="PKR" format={formatMoney} />
              </Section>

              <Section title="Sales by brand" caption={`${caption}, top 10`} card>
                <BarList
                  items={a.revenueByBrand.map((b) => ({
                    key: b.brandId,
                    label: b.brandName,
                    value: b.revenue,
                    display: formatMoney(b.revenue),
                    detail: `${formatCount(b.orders)} orders`,
                    onPress: b.ownerId ? () => openProvider(navigation, b.ownerId) : undefined,
                  }))}
                  emptyText="No delivered orders in this period."
                />
              </Section>

              <Section title="Orders by status" caption={caption} card>
                <BarList
                  items={Object.entries(a.ordersByStatus).map(([status, count]) => ({
                    key: status,
                    label: presentStatus(meta, 'orderStatuses', status).label,
                    value: count,
                    display: formatCount(count),
                  }))}
                  emptyText="No orders in this period."
                />
              </Section>

              <Section title="Best sellers" caption={`${caption}, by delivered order value`} card>
                <BarList
                  items={a.topProducts.map((p) => ({
                    key: p.productId,
                    label: p.name,
                    value: p.revenue,
                    display: formatMoney(p.revenue),
                    detail: `${formatCount(p.unitsSold)} sold`,
                  }))}
                  emptyText="No sales yet."
                />
              </Section>
            </>
          )}
        </QueryState>
      </PermissionGate>
    </AdminScreen>
  );
}
