// ============================================================================
// Modules tab — the three verticals, each shown only to admins who manage it.
// Full names throughout ("Home services", not "HS").
// ============================================================================

import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, Section } from '../../../components/admin';
import { EmptyState, ListRow } from '../../../components/ui';
import { usePermission } from '../../../hooks/useAdminPermission';

type Row = { title: string; subtitle: string; icon: string; route: string; show: boolean };

export default function AdminModulesScreen() {
  const navigation = useNavigation<any>();
  const homeServices = usePermission('canManageHomeServices');
  const finance = usePermission('canManageFinance');
  const healthcare = usePermission('canManageHealthcare');
  const shopping = usePermission('canManageShopping');
  const analytics = usePermission('canViewAnalytics');

  const homeServiceRows: Row[] = [
    { title: 'Bookings', subtitle: 'Status, refunds and payment trail', icon: 'calendar-outline', route: 'AdminHSBookings', show: true },
    { title: 'Disputes', subtitle: 'Customer and provider disputes', icon: 'chatbox-ellipses-outline', route: 'AdminHSDisputes', show: true },
    { title: 'Payout requests', subtitle: 'Provider withdrawals to approve', icon: 'cash-outline', route: 'AdminHSPayouts', show: finance },
    { title: 'Service categories', subtitle: 'What customers can book', icon: 'grid-outline', route: 'AdminHSServiceCategories', show: true },
    { title: 'Analytics', subtitle: 'Bookings and revenue over time', icon: 'bar-chart-outline', route: 'AdminHSAnalytics', show: true },
    { title: 'Settings', subtitle: 'Commission, payouts and matching', icon: 'settings-outline', route: 'AdminHSSettings', show: true },
  ].filter((r) => r.show);

  return (
    <AdminScreen title="Modules" hideBack>
      {analytics && (
        <Section title="Platform" card>
          <ListRow
            title="Platform analytics"
            subtitle="Live usage, demand forecasts, leaderboards and ML models"
            icon="pulse-outline"
            onPress={() => navigation.navigate('PlatformAnalytics')}
          />
        </Section>
      )}

      {!homeServices && !healthcare && !shopping && !analytics && (
        <EmptyState icon="apps-outline" title="No modules" message="Your account doesn't manage any module. Ask a super admin if you need one." />
      )}

      {homeServices && (
        <Section title="Home services" card>
          {homeServiceRows.map((row, i) => (
            <ListRow
              key={row.route}
              title={row.title}
              subtitle={row.subtitle}
              icon={row.icon}
              onPress={() => navigation.navigate(row.route)}
              divider={i < homeServiceRows.length - 1}
            />
          ))}
        </Section>
      )}

      {healthcare && (
        <Section title="Healthcare" card>
          <ListRow
            title="Healthcare"
            subtitle="Doctors, appointments, clinics, reviews and settings"
            icon="medkit-outline"
            onPress={() => navigation.navigate('AdminHealthcareDashboard')}
          />
        </Section>
      )}

      {shopping && (
        <Section title="Shopping" card>
          <ListRow
            title="Shopping"
            subtitle="Brands, outlets, banners, orders and settings"
            icon="bag-handle-outline"
            onPress={() => navigation.navigate('AdminShopping')}
          />
        </Section>
      )}
    </AdminScreen>
  );
}
