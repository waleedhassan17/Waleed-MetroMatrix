// ============================================================================
// Doctors — verification and availability.
//
// A doctor is a provider with a medical licence (PMC). Verifying lets them
// take appointments; rejecting needs a reason, which the doctor is told.
// Suspending hides a verified doctor from patient search and stops new
// bookings without touching existing appointments. Every row also opens the
// doctor's provider details and analytics.
//
// Opened from a notification or the Queue with { doctorId }, it goes straight
// to that doctor.
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { skipToken } from '@reduxjs/toolkit/query';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { ActionSheet, TextField, showToast, type SheetOption } from '../../../../components/ui';
import { enumOptions, presentStatus, useAdminMeta } from '../../../../hooks/useAdminMeta';
import { usePermission } from '../../../../hooks/useAdminPermission';
import useDebouncedValue from '../../../../hooks/useDebouncedValue';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import {
  nameOf,
  useApproveHCDoctorMutation,
  useGetHCDoctorQuery,
  useListHCDoctorsInfiniteQuery,
  useRejectHCDoctorMutation,
  useSetHCDoctorActiveMutation,
  type HCDoctor,
} from '../../../../networks/admin/healthcareApi';
import { formatRating } from '../../../../utils/admin/format';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';
import { doctorActions, doctorSubtitle, type DoctorAction } from './doctorRow';

const COPY: Record<DoctorAction, { title: (name: string) => string; message: string; label: string; destructive?: boolean; reason: boolean; reasonLabel?: string }> = {
  verify: {
    title: (n) => `Verify Dr. ${n}?`,
    message: 'They can take appointments and appear in patient search.',
    label: 'Verify',
    reason: false,
  },
  reject: {
    title: (n) => `Reject Dr. ${n}?`,
    message: 'They cannot take appointments. They can correct their details and apply again.',
    label: 'Reject',
    destructive: true,
    reason: true,
    reasonLabel: 'Reason, shown to the doctor',
  },
  suspend: {
    title: (n) => `Suspend Dr. ${n}?`,
    message: 'They disappear from patient search and cannot take new bookings. Existing appointments stay.',
    label: 'Suspend',
    destructive: true,
    reason: true,
  },
  reactivate: {
    title: (n) => `Reactivate Dr. ${n}?`,
    message: 'They appear in patient search and can take bookings again.',
    label: 'Reactivate',
    reason: true,
  },
};

const DONE: Record<DoctorAction, string> = {
  verify: 'Doctor verified.',
  reject: 'Doctor rejected.',
  suspend: 'Doctor suspended.',
  reactivate: 'Doctor reactivated.',
};

export default function DoctorManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const focusId = ((useRoute().params ?? {}) as { doctorId?: string }).doctorId;
  const { data: meta } = useAdminMeta();
  const canDecide = usePermission('canManageHealthcare');
  const [status, setStatus] = useState(focusId ? 'all' : 'pending');
  const [search, setSearch] = useState('');
  const searchQuery = useDebouncedValue(search.trim());

  const list = useListHCDoctorsInfiniteQuery({ status: status === 'all' ? undefined : status, search: searchQuery || undefined });
  const items = flattenPages(list.data?.pages);
  const counts = list.data?.pages[0]?.meta.counts as Record<string, number> | undefined;
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0) : undefined;

  const [approve, approveState] = useApproveHCDoctorMutation();
  const [reject, rejectState] = useRejectHCDoctorMutation();
  const [setActive, setActiveState] = useSetHCDoctorActiveMutation();

  const [menu, setMenu] = useState<HCDoctor | null>(null);
  const [acting, setActing] = useState<{ doctor: HCDoctor; action: DoctorAction } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opened on one doctor: show their choices as soon as they load.
  const focus = useGetHCDoctorQuery(focusId ?? skipToken);
  const focused = useRef(false);
  useEffect(() => {
    if (focus.data?.doctor && !focused.current) {
      focused.current = true;
      setMenu(focus.data.doctor);
    }
  }, [focus.data]);

  const confirm = async (reason: string) => {
    if (!acting) return;
    const { doctor, action } = acting;
    const res =
      action === 'verify'
        ? await approve({ id: doctor.id })
        : action === 'reject'
          ? await reject({ id: doctor.id, reason })
          : await setActive({ id: doctor.id, active: action === 'reactivate', reason });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'That did not work.');
    setActing(null);
    showToast({ tone: 'success', message: DONE[action] });
  };

  const menuName = nameOf(menu?.providerId, 'doctor');
  const menuOptions: SheetOption[] = menu
    ? [
        ...(canDecide
          ? doctorActions(menu).map((action) => ({
              label: COPY[action].label,
              icon: action === 'verify' ? 'checkmark-circle-outline' : action === 'reject' ? 'close-circle-outline' : action === 'suspend' ? 'pause-circle-outline' : 'play-circle-outline',
              tone: COPY[action].destructive ? ('destructive' as const) : ('default' as const),
              onPress: () => {
                const doctor = menu;
                setMenu(null);
                setError(null);
                setActing({ doctor, action });
              },
            }))
          : []),
        ...(idOf(menu.providerId)
          ? [
              {
                label: 'Open their details and analytics',
                icon: 'person-outline',
                onPress: () => {
                  const id = idOf(menu.providerId);
                  setMenu(null);
                  openProvider(navigation, id);
                },
              },
            ]
          : []),
      ]
    : [];

  const copy = acting ? COPY[acting.action] : null;

  return (
    <AdminScreen title="Doctors" subtitle="Healthcare" scroll={false}>
      <PermissionGate all={['canManageHealthcare']} action="see doctors">
        <View style={styles.controls}>
          <TextField
            placeholder="Search by name or PMC number"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search doctors by name or PMC number"
          />
          <FilterChips
            options={[
              { value: 'all', label: 'All', count: total },
              ...enumOptions(meta, 'doctorVerificationStatuses').map((o) => ({ ...o, count: counts?.[o.value] })),
            ]}
            value={status}
            onChange={setStatus}
          />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="medkit-outline"
          emptyTitle={searchQuery ? 'No doctors match' : status === 'pending' ? 'No doctors waiting for verification' : 'No doctors here'}
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <EntityRow
                avatar={{ name: nameOf(item.providerId, 'Doctor') }}
                title={`Dr. ${nameOf(item.providerId, '—')}`}
                subtitle={doctorSubtitle(item)}
                badge={item.isActive === false ? { label: 'Suspended', tone: 'warning' } : presentStatus(meta, 'doctorVerificationStatuses', item.verificationStatus)}
                meta={item.rating ? formatRating(item.rating, item.totalReviews) : null}
                onPress={() => setMenu(item)}
                divider={index < items.length - 1}
              />
            )}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <ActionSheet visible={!!menu} title={`Dr. ${menuName}`} message={menu ? doctorSubtitle(menu) : undefined} options={menuOptions} onClose={() => setMenu(null)} />

      <ConfirmSheet
        visible={!!acting}
        title={copy && acting ? copy.title(nameOf(acting.doctor.providerId, 'this doctor')) : ''}
        message={copy?.message}
        confirmLabel={copy?.label ?? ''}
        destructive={copy?.destructive}
        requireReason={copy?.reason}
        reasonLabel={copy?.reasonLabel}
        busy={approveState.isLoading || rejectState.isLoading || setActiveState.isLoading}
        error={error}
        onConfirm={confirm}
        onClose={() => setActing(null)}
      />
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
