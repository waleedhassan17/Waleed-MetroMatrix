// ============================================================================
// Every healthcare appointment, newest first: filter by status and type,
// search by patient. A row opens the appointment (payment trail and the two
// audited admin actions); a long press opens the doctor.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { TextField } from '../../../../components/ui';
import { formatMoney } from '../../../../constants/Currency';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import useDebouncedValue from '../../../../hooks/useDebouncedValue';
import { flattenPages } from '../../../../networks/admin/adminApi';
import { nameOf, useListHCAppointmentsInfiniteQuery, type HCAppointment } from '../../../../networks/admin/healthcareApi';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';
import { APPOINTMENT_TYPES, appointmentWhen, typeLabel } from '../appointmentLabels';

export default function AdminAppointmentsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { data: meta } = useAdminMeta();
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [patient, setPatient] = useState('');
  const patientQuery = useDebouncedValue(patient.trim());

  const list = useListHCAppointmentsInfiniteQuery({
    status: status === 'all' ? undefined : status,
    type: type === 'all' ? undefined : type,
    patient: patientQuery || undefined,
  });
  const items = flattenPages(list.data?.pages);

  return (
    <AdminScreen title="Appointments" subtitle="Healthcare" scroll={false}>
      <PermissionGate all={['canManageHealthcare']} action="see appointments">
        <View style={styles.controls}>
          <TextField
            placeholder="Search patient name or email"
            value={patient}
            onChangeText={setPatient}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search appointments by patient"
          />
          <FilterChips options={[{ value: 'all', label: 'All' }, ...enumOptions(meta, 'appointmentStatuses')]} value={status} onChange={setStatus} />
          <FilterChips options={APPOINTMENT_TYPES} value={type} onChange={setType} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="calendar-outline"
          emptyTitle="No appointments match"
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const doctor = item.doctorId?.providerId;
              const doctorId = idOf(doctor);
              return (
                <EntityRow
                  title={nameOf(item.patientId, item.patientInfo?.name || 'Patient')}
                  subtitle={[`Dr. ${nameOf(doctor, '—')}`, typeLabel(item.type), appointmentWhen(item)].filter(Boolean).join(' · ')}
                  badge={presentStatus(meta, 'appointmentStatuses', item.status)}
                  meta={[formatMoney(item.totalAmount), item.payment?.status].filter(Boolean).join(' · ')}
                  onPress={() => navigation.navigate('AdminAppointmentDetail', { appointmentId: item.id })}
                  onLongPress={doctorId ? () => openProvider(navigation, doctorId) : undefined}
                  accessibilityLabel={`Appointment for ${nameOf(item.patientId, 'a patient')} with Dr. ${nameOf(doctor, 'unknown')}. ${
                    presentStatus(meta, 'appointmentStatuses', item.status).label
                  }.${doctorId ? ' Long press to open the doctor.' : ''}`}
                  divider={index < items.length - 1}
                />
              );
            }}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>
    </AdminScreen>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
