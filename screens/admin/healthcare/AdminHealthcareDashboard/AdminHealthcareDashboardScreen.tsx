// ============================================================================
// Healthcare hub — the entry to everything healthcare in the console.
//
// Figures from GET /api/v1/admin/healthcare/dashboard, each labelled with the
// period it covers (the server counts "today" in Pakistan time). This screen
// used to draw its tile grid even when the request failed, showing a row of
// zeros that read as "nothing is happening" instead of "couldn't load".
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, BarList, KpiGrid, KpiTile, PermissionGate, QueryState, Section } from '../../../../components/admin';
import { ListRow } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { fetchAdminHealthcareDashboardApi } from '../../../../networks/healthcare/adminApi';
import { formatCount, formatPercent } from '../../../../utils/admin/format';

interface DashboardData {
  pendingDoctorApprovals: number;
  appointmentsToday: number;
  revenueToday: number;
  /** All-time share of appointments that were cancelled; null with no appointments. */
  cancellationRate: number | null;
  openRefundCandidates: number;
  topSpecialties: { specialtyId?: string | null; name?: string | null; count: number }[];
}

const LINKS: { label: string; route: string; icon: string; subtitle: string }[] = [
  { label: 'Doctors', route: 'DoctorManagement', icon: 'medkit-outline', subtitle: 'Verification, status and documents' },
  { label: 'Appointments', route: 'AdminAppointments', icon: 'calendar-outline', subtitle: 'Status, refunds and payment trail' },
  { label: 'Clinics', route: 'AdminClinicManagement', icon: 'business-outline', subtitle: 'Clinic listings' },
  { label: 'Reviews', route: 'AdminReviewModeration', icon: 'star-half-outline', subtitle: 'Moderate patient reviews' },
  { label: 'Specialties', route: 'SpecialtyManagement', icon: 'grid-outline', subtitle: 'What patients can book' },
  { label: 'Analytics', route: 'HealthcareAnalytics', icon: 'bar-chart-outline', subtitle: 'Appointments and revenue over time' },
  { label: 'Settings', route: 'AdminHealthcareSettings', icon: 'settings-outline', subtitle: 'Commission and cancellation rules' },
];

export default function AdminHealthcareDashboardScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string; status: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminHealthcareDashboardApi();
    if (res.success && res.data) setData(res.data as DashboardData);
    else {
      const failed = res as { code?: string; status?: number; message?: string };
      setError({ code: failed.code || 'ERROR', status: typeof failed.status === 'number' ? failed.status : 0, message: failed.message || 'Could not load the overview.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminScreen title="Healthcare" refreshing={loading && !!data} onRefresh={load}>
      <PermissionGate all={['canManageHealthcare']} action="manage healthcare">
        <Section title="Needs attention">
          <QueryState isLoading={loading && !data} error={data ? null : error} onRetry={load} skeletonCount={1}>
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
              <KpiTile label="Consultation revenue" value={formatMoney(data.revenueToday)} caption="Completed today" />
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
