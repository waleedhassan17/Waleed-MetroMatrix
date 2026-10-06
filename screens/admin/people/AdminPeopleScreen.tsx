// ============================================================================
// People — providers and customers (and, for admin managers, a way to admins).
//
// One list per kind, paged by the server (cursor or page), searchable, with
// state filters and counts from the server. A provider row shows their
// rating and opens their details and analytics; a customer row shows when
// they were last active. Replaces three screens of about
// 1,370 lines each (pending review, provider management, user management)
// that each kept their own copy of the list, its filters and its colours.
//
// A super admin also gets a "Deleted" filter on both lists: a deleted account
// opens a sheet to restore it (with a reason, for the audit log). Restoring
// gives the person their email back unless someone has taken it since.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, EntityRow, FilterChips, QueryState } from '../../../components/admin';
import { SegmentedControl, TextField, showToast } from '../../../components/ui';
import { useIsSuperAdmin, usePermission } from '../../../hooks/useAdminPermission';
import { enumOptions, presentStatus, useAdminMeta } from '../../../hooks/useAdminMeta';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import {
  adminErrorOf,
  flattenPages,
  useListProvidersInfiniteQuery,
  useListUsersInfiniteQuery,
  useRestoreProviderMutation,
  useRestoreUserMutation,
} from '../../../networks/admin/adminApi';
import { formatAgo } from '../../../utils/admin/format';
import { openProvider } from './openProvider';
import { GUTTER, S, useTheme, type ThemeColors } from '../../../theme';

type Segment = 'providers' | 'users';

export default function AdminPeopleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const canProviders = usePermission('canApproveProviders');
  const canUsers = usePermission('canManageUsers');
  const canAdmins = usePermission('canManageAdmins');
  const isSuperAdmin = useIsSuperAdmin();

  const requested = (route.params as { segment?: Segment | 'admins' } | undefined)?.segment;
  const [segment, setSegment] = useState<Segment>(requested === 'users' || !canProviders ? 'users' : 'providers');
  const [providerState, setProviderState] = useState('pending');
  const [userStatus, setUserStatus] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const { data: meta } = useAdminMeta();

  const segments = [
    ...(canProviders ? [{ value: 'providers' as const, label: 'Providers' }] : []),
    ...(canUsers ? [{ value: 'users' as const, label: 'Customers' }] : []),
  ];

  const providers = useListProvidersInfiniteQuery(
    { state: providerState, search: query || undefined },
    { skip: segment !== 'providers' || !canProviders }
  );
  const users = useListUsersInfiniteQuery(
    { status: userStatus === 'all' ? undefined : userStatus, search: query || undefined },
    { skip: segment !== 'users' || !canUsers }
  );

  const providerCounts = providers.data?.pages[0]?.meta.counts as Record<string, number> | undefined;
  const userCounts = users.data?.pages[0]?.meta.counts as Record<string, number> | undefined;
  const deletedChip = (counts?: Record<string, number>) => (isSuperAdmin ? [{ value: 'deleted', label: 'Deleted', count: counts?.deleted }] : []);
  const providerFilters = [
    { value: 'all', label: 'All' },
    ...enumOptions(meta, 'providerStates').map((o) => ({ value: o.value, label: o.label, count: providerCounts?.[o.value] })),
    ...deletedChip(providerCounts),
  ];
  const userFilters = [
    { value: 'all', label: 'All', count: userCounts && typeof userCounts.active === 'number' && typeof userCounts.inactive === 'number' ? userCounts.active + userCounts.inactive : undefined },
    { value: 'active', label: 'Active', count: userCounts?.active },
    { value: 'inactive', label: 'Deactivated', count: userCounts?.inactive },
    ...deletedChip(userCounts),
  ];

  const [restoreProvider, restoreProviderState] = useRestoreProviderMutation();
  const [restoreUser, restoreUserState] = useRestoreUserMutation();
  const [restoring, setRestoring] = useState<{ kind: 'provider' | 'user'; id: string; name: string } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const startRestore = (kind: 'provider' | 'user', id: string, name: string) => {
    setRestoreError(null);
    setRestoring({ kind, id, name });
  };
  const confirmRestore = async (reason: string) => {
    if (!restoring) return;
    const res = restoring.kind === 'provider' ? await restoreProvider({ id: restoring.id, reason }) : await restoreUser({ id: restoring.id, reason });
    if ('error' in res) return setRestoreError(adminErrorOf(res.error)?.message || 'The account was not restored.');
    setRestoring(null);
    showToast({ tone: 'success', message: `${restoring.name} is back. They can sign in again.` });
  };
  const typeLabel = (value: string) => enumOptions(meta, 'providerTypes').find((o) => o.value === value)?.label ?? value;

  const active = segment === 'providers' ? providers : users;
  const providerItems = flattenPages(providers.data?.pages);
  const userItems = flattenPages(users.data?.pages);
  const count = segment === 'providers' ? providerItems.length : userItems.length;

  const listProps = {
    contentContainerStyle: styles.list,
    onEndReached: () => active.hasNextPage && !active.isFetchingNextPage && active.fetchNextPage(),
    onEndReachedThreshold: 0.5,
    keyboardShouldPersistTaps: 'handled' as const,
    refreshControl: (
      <RefreshControl refreshing={active.isFetching && !active.isFetchingNextPage && !active.isLoading} onRefresh={active.refetch} tintColor={colors.inkMuted} />
    ),
    ListFooterComponent: active.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null,
  };

  return (
    <AdminScreen
      title="People"
      hideBack
      scroll={false}
      headerActions={canAdmins ? [{ icon: 'shield-checkmark-outline', label: 'Admins', onPress: () => navigation.navigate('AdminManagement') }] : undefined}
    >
      <View style={styles.controls}>
        {segments.length > 1 && <SegmentedControl options={segments} value={segment} onChange={setSegment} style={styles.segment} />}
        <TextField
          placeholder={segment === 'providers' ? 'Search name, email, phone or business' : 'Search name, email or phone'}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={`Search ${segment === 'providers' ? 'providers' : 'customers'}`}
          containerStyle={styles.search}
        />
        {segment === 'providers' ? (
          <FilterChips options={providerFilters} value={providerState} onChange={setProviderState} />
        ) : (
          <FilterChips options={userFilters} value={userStatus} onChange={(v) => setUserStatus(v as typeof userStatus)} />
        )}
      </View>

      <QueryState
        isLoading={active.isLoading}
        error={active.error}
        onRetry={active.refetch}
        isEmpty={count === 0}
        emptyIcon="people-outline"
        emptyTitle={query ? 'No matches' : segment === 'providers' ? 'No providers here' : 'No customers here'}
        emptyMessage={query ? 'Try a different name, email or phone number.' : undefined}
        action={segment === 'providers' ? 'see providers' : 'see customers'}
        skeleton="rows"
        skeletonCount={6}
        style={styles.state}
      >
        {segment === 'providers' ? (
          <FlatList
            {...listProps}
            data={providerItems}
            keyExtractor={(p) => p.id}
            renderItem={({ item, index }) => {
              const status = presentStatus(meta, 'providerStates', item.state);
              if (item.deletedAt) {
                return (
                  <EntityRow
                    avatar={{ name: item.fullName, uri: item.profilePhoto }}
                    title={item.fullName}
                    subtitle={[item.email, item.deleteReason].filter(Boolean).join(' · ')}
                    badge={{ label: 'Deleted', tone: 'neutral' }}
                    meta={formatAgo(item.deletedAt)}
                    onPress={() => startRestore('provider', item.id, item.fullName)}
                    accessibilityLabel={`${item.fullName}, deleted. Restore.`}
                    divider={index < providerItems.length - 1}
                  />
                );
              }
              return (
                <EntityRow
                  avatar={{ name: item.fullName, uri: item.profilePhoto }}
                  title={item.fullName}
                  subtitle={
                    [
                      typeLabel(item.providerSubType || item.providerType),
                      item.city,
                      item.rating?.count && typeof item.rating.average === 'number' ? `★ ${item.rating.average.toFixed(1)} (${item.rating.count})` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || item.email
                  }
                  badge={status}
                  meta={item.state === 'pending' && item.submittedAt ? formatAgo(item.submittedAt) : null}
                  onPress={() => openProvider(navigation, item.id)}
                  divider={index < providerItems.length - 1}
                />
              );
            }}
          />
        ) : (
          <FlatList
            {...listProps}
            data={userItems}
            keyExtractor={(u) => u.id}
            renderItem={({ item, index }) =>
              item.deletedAt ? (
                <EntityRow
                  avatar={{ name: item.fullName, uri: item.profilePhoto }}
                  title={item.fullName}
                  subtitle={[item.email, item.deleteReason].filter(Boolean).join(' · ')}
                  badge={{ label: 'Deleted', tone: 'neutral' }}
                  meta={formatAgo(item.deletedAt)}
                  onPress={() => startRestore('user', item.id, item.fullName)}
                  accessibilityLabel={`${item.fullName}, deleted. Restore.`}
                  divider={index < userItems.length - 1}
                />
              ) : (
                <EntityRow
                  avatar={{ name: item.fullName, uri: item.profilePhoto }}
                  title={item.fullName}
                  subtitle={item.email}
                  badge={item.isActive ? null : { label: 'Deactivated', tone: 'error' }}
                  meta={item.lastLoginAt ? `Active ${formatAgo(item.lastLoginAt)}` : null}
                  onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
                  divider={index < userItems.length - 1}
                />
              )
            }
          />
        )}
      </QueryState>

      <ConfirmSheet
        visible={!!restoring}
        title={`Restore ${restoring?.name}?`}
        message="Their account comes back as it was, with their email if no one has taken it since. They can sign in again."
        confirmLabel="Restore"
        requireReason
        busy={restoreProviderState.isLoading || restoreUserState.isLoading}
        error={restoreError}
        onConfirm={confirmRestore}
        onClose={() => setRestoring(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    segment: { marginBottom: S.sm },
    search: { marginBottom: S.xs },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
