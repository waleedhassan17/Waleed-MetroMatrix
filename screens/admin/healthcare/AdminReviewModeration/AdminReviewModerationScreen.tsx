// ============================================================================
// Healthcare review moderation — what patients wrote about their doctors.
//
// Removing a review needs a reason (it is audited) and recalculates the
// doctor's rating from the reviews that remain. The low-rated filter is the
// usual way in: two stars and under.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AdminScreen, ConfirmSheet, FilterChips, PermissionGate, QueryState } from '../../../../components/admin';
import { showToast } from '../../../../components/ui';
import { usePermission } from '../../../../hooks/useAdminPermission';
import { adminErrorOf, flattenPages } from '../../../../networks/admin/adminApi';
import { nameOf, useDeleteHCReviewMutation, useListHCReviewsInfiniteQuery, type HCReview } from '../../../../networks/admin/healthcareApi';
import { formatDate } from '../../../../utils/admin/format';
import { GUTTER, R, S, T, useTheme, type ThemeColors } from '../../../../theme';
import { idOf, openProvider } from '../../people/openProvider';

const FILTERS = [
  { value: 'all', label: 'All reviews' },
  { value: 'low', label: 'Two stars and under' },
];

export default function AdminReviewModerationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const canModerate = usePermission('canManageHealthcare');
  const [filter, setFilter] = useState('all');

  const list = useListHCReviewsInfiniteQuery({ maxRating: filter === 'low' ? 2 : undefined });
  const items = flattenPages(list.data?.pages);
  const [remove, removeState] = useDeleteHCReviewMutation();
  const [removing, setRemoving] = useState<HCReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmRemove = async (reason: string) => {
    if (!removing) return;
    const res = await remove({ id: removing.id, reason });
    if ('error' in res) return setError(adminErrorOf(res.error)?.message || 'The review was not removed.');
    setRemoving(null);
    showToast({ tone: 'success', message: "Review removed. The doctor's rating has been recalculated." });
  };

  const renderReview = ({ item, index }: { item: HCReview; index: number }) => {
    const doctor = item.doctorId?.providerId;
    const doctorName = nameOf(doctor, 'the doctor');
    const providerId = idOf(doctor);
    return (
      <View style={[styles.review, index < items.length - 1 && styles.divider]}>
        <View style={styles.top}>
          <Text style={styles.who} numberOfLines={1}>
            {nameOf(item.patientId, 'A patient')}
          </Text>
          <View style={styles.stars} accessible accessibilityLabel={`${item.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name={i <= Number(item.rating) ? 'star' : 'star-outline'} size={14} color={colors.warning} />
            ))}
          </View>
        </View>
        {providerId ? (
          <Pressable
            onPress={() => openProvider(navigation, providerId)}
            style={styles.linkHit}
            accessibilityRole="link"
            accessibilityLabel={`About Dr. ${doctorName}. Opens their details and analytics.`}
          >
            <Text style={styles.link}>About Dr. {doctorName}</Text>
          </Pressable>
        ) : (
          <Text style={styles.muted}>About Dr. {doctorName}</Text>
        )}
        {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
        <View style={styles.bottom}>
          <Text style={styles.muted}>{formatDate(item.createdAt)}</Text>
          {canModerate && (
            <Pressable
              onPress={() => {
                setError(null);
                setRemoving(item);
              }}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Remove the review by ${nameOf(item.patientId, 'a patient')}`}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <AdminScreen title="Review moderation" subtitle="Healthcare" scroll={false}>
      <PermissionGate all={['canManageHealthcare']} action="moderate reviews">
        <View style={styles.controls}>
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        </View>
        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          isEmpty={!items.length}
          emptyIcon="star-outline"
          emptyTitle={filter === 'low' ? 'No low-rated reviews' : 'No reviews yet'}
          skeleton="rows"
          style={styles.state}
        >
          <FlatList
            data={items}
            keyExtractor={(r) => r.id}
            renderItem={renderReview}
            contentContainerStyle={styles.list}
            onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={list.isFetching && !list.isFetchingNextPage && !list.isLoading} onRefresh={list.refetch} tintColor={colors.inkMuted} />}
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.inkMuted} style={styles.more} /> : null}
          />
        </QueryState>
      </PermissionGate>

      <ConfirmSheet
        visible={!!removing}
        title="Remove this review?"
        message="It disappears from the doctor's profile, and their rating is recalculated from the reviews that remain."
        confirmLabel="Remove review"
        destructive
        requireReason
        busy={removeState.isLoading}
        error={error}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    controls: { paddingHorizontal: GUTTER, paddingTop: S.md },
    state: { marginHorizontal: GUTTER },
    list: { paddingHorizontal: GUTTER, paddingBottom: S.huge },
    more: { marginVertical: S.lg },
    review: { paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
    who: { ...T.bodyStrong, color: c.ink, flex: 1 },
    stars: { flexDirection: 'row', gap: S.xs / 2 },
    linkHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    link: { ...T.body, color: c.accentDeep },
    comment: { ...T.body, color: c.ink, marginBottom: S.sm },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muted: { ...T.caption, color: c.inkMuted },
    remove: { flexDirection: 'row', alignItems: 'center', gap: S.xs, minHeight: 44, paddingHorizontal: S.md, borderRadius: R.control },
    pressed: { backgroundColor: c.surfaceSunken },
    removeText: { ...T.bodyStrong, color: c.error },
  });
