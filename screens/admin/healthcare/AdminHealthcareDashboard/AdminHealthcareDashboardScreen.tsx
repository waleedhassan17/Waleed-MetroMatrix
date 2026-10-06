// ============================================================================
// Healthcare hub — the entry to everything healthcare in the console.
//
// Figures from GET /api/v1/admin/healthcare/dashboard, each labelled with the
// period it covers (the server counts "today" in Pakistan time). This screen
// used to draw its tile grid even when the request failed, showing a row of
// zeros that read as "nothing is happening" instead of "couldn't load".
// ============================================================================

import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, BarList, KpiGrid, KpiTile, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { ListRow } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { useGetHCDashboardQuery } from '../../../../networks/admin/healthcareApi';
import { formatCount, formatPercent } from '../../../../utils/admin/format';

const LINKS: { label: string; route: string; icon: string; subtitle: string }[] = [
  { label: 'Doctors', route: 'DoctorManagement', icon: 'medkit-outline', subtitle: 'Verification, status and documents' },
  { label: 'Appointments', route: 'AdminAppointments', icon: 'calendar-outline', subtitle: 'Status, refunds and payment trail' },
  { label: 'Clinics', route: 'AdminClinicManagement', icon: 'business-outline', subtitle: 'Clinic listings' },
  { label: 'Reviews', route: 'AdminReviewModeration', icon: 'star-half-outline', subtitle: 'Moderate patient reviews' },
  { label: 'Specialties', route: 'SpecialtyManagement', icon: 'grid-outline', subtitle: 'What patients can book' },
  { label: 'Analytics', route: 'HealthcareAnalytics', icon: 'bar-chart-outline', subtitle: 'Appointments and payments over time' },
  { label: 'Settings', route: 'AdminHealthcareSettings', icon: 'settings-outline', subtitle: 'Cancellation and refund rules' },
];

export default function AdminHealthcareDashboardScreen() {
  const navigation = useNavigation<any>();
  const dash = useGetHCDashboardQuery();
  const data = dash.data;

  return (
    <AdminScreen title="Healthcare" refreshing={dash.isFetching && !dash.isLoading} onRefresh={dash.refetch}>
      <PermissionGate all={['canManageHealthcare']} action="manage healthcare">
        <Section title="Needs attention">
          <QueryState isLoading={dash.isLoading} error={data ? null : dash.error} onRetry={dash.refetch} skeletonCount={1}>
            <KpiGrid>
              <KpiTile
                label="Doctors awaiting verification"
                value={formatCount(data?.pendingDoctorApprovals)}
                caption="Now"
                tone={data?.pendingDoctorApprovals ? 'warning' : 'neutral'}
                onPress={() => navigation.navigate('DoctorManagement')}
              />
              <KpiTile
                label="Paid, then cancelled"
                value={formatCount(data?.openRefundCandidates)}
                caption="Check whether a refund is due"
                tone={data?.openRefundCandidates ? 'warning' : 'neutral'}
                onPress={() => navigation.navigate('AdminAppointments')}
              />
            </KpiGrid>
          </QueryState>
        </Section>

        {!!data && (
          <Section title="Activity">
            <KpiGrid>
              <KpiTile label="Appointments booked" value={formatCount(data.appointmentsToday)} caption="Today" />
              <KpiTile label="Consultations paid" value={formatMoney(data.revenueToday)} caption="Completed today" />
              <KpiTile label="Cancellation rate" value={formatPercent(data.cancellationRate)} caption="All time" />
            </KpiGrid>
          </Section>
        )}

        {!!data && (
          <Section title="Most booked specialties" caption="All time" card>
            <BarList
              items={data.topSpecialties.map((s, i) => ({
                key: s.specialtyId ?? `unassigned-${i}`,
                label: s.name || 'No specialty',
                value: s.count,
                display: `${formatCount(s.count)} appts`,
              }))}
              emptyText="No appointments yet."
            />
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
