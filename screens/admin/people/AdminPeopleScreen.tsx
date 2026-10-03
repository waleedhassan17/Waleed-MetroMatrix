// ============================================================================
// People — providers and customers (and, for admin managers, a way to admins).
//
// One list per kind, paged by the server (cursor or page), searchable, with
// state filters and counts from the server. Replaces three screens of about
// 1,370 lines each (pending review, provider management, user management)
// that each kept their own copy of the list, its filters and its colours.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AdminScreen, EntityRow, FilterChips, QueryState } from '../../../components/admin';
import { Button, SegmentedControl, TextField } from '../../../components/ui';
import { usePermission } from '../../../hooks/useAdminPermission';
import { enumOptions, presentStatus, useAdminMeta } from '../../../hooks/useAdminMeta';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { flattenPages, useListProvidersInfiniteQuery, useListUsersInfiniteQuery } from '../../../networks/admin/adminApi';
import { formatAgo } from '../../../utils/admin/format';
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

  const requested = (route.params as { segment?: Segment | 'admins' } | undefined)?.segment;
  const [segment, setSegment] = useState<Segment>(requested === 'users' || !canProviders ? 'users' : 'providers');
  const [providerState, setProviderState] = useState('pending');
  const [userStatus, setUserStatus] = useState<'all' | 'active' | 'inactive'>('all');
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
  const providerFilters = [
    { value: 'all', label: 'All' },
    ...enumOptions(meta, 'providerStates').map((o) => ({ value: o.value, label: o.label, count: providerCounts?.[o.value] })),
  ];
  const userFilters = [
    { value: 'all', label: 'All', count: userCounts && typeof userCounts.active === 'number' && typeof userCounts.inactive === 'number' ? userCounts.active + userCounts.inactive : undefined },
    { value: 'active', label: 'Active', count: userCounts?.active },
    { value: 'inactive', label: 'Deactivated', count: userCounts?.inactive },
  ];
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
      right={canAdmins ? <Button label="Admins" variant="ghost" icon="shield-checkmark-outline" onPress={() => navigation.navigate('AdminManagement')} /> : undefined}
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
        style={styles.state}
      >
        {segment === 'providers' ? (
          <FlatList
            {...listProps}
            data={providerItems}
            keyExtractor={(p) => p.id}
            renderItem={({ item, index }) => {
              const status = presentStatus(meta, 'providerStates', item.state);
              return (
                <EntityRow
                  avatar={{ name: item.fullName, uri: item.profilePhoto }}
                  title={item.fullName}
                  subtitle={[typeLabel(item.providerSubType || item.providerType), item.city].filter(Boolean).join(' · ') || item.email}
                  badge={status}
                  meta={item.state === 'pending' && item.submittedAt ? formatAgo(item.submittedAt) : null}
                  onPress={() => navigation.navigate('AdminProviderDetail', { providerId: item.id })}
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
            renderItem={({ item, index }) => (
              <EntityRow
                avatar={{ name: item.fullName, uri: item.profilePhoto }}
                title={item.fullName}
                subtitle={item.email}
                badge={item.isActive ? null : { label: 'Deactivated', tone: 'error' }}
                meta={item.lastLoginAt ? formatAgo(item.lastLoginAt) : null}
                onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
                divider={index < userItems.length - 1}
              />
            )}
          />
        )}
      </QueryState>
    </AdminScreen>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    segment: { marginBottom: S.md },
    search: { marginBottom: S.sm },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
  });
