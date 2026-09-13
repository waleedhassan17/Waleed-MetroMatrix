import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AppBar,
  Avatar,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonCard,
} from '../../../../components/ui';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import type { ReviewItem, ReviewStats } from '../../../../models/healthcare/doctorHub';
import { fetchDoctorReviews } from '../../../../networks/healthcare/doctorHubApi';
import { ThemeColors, useTheme } from '../../../../theme';
import { formatDateLabel } from '../../../../utils/healthcare/doctorFormat';
import { dateKeyOf } from '../../../../utils/healthcare/timeRanges';

// ============================================================================
// Reviews.
//
// The average read `stats.average`, which the server never sent, so every
// doctor was shown a 0.0 rating. Filtering happened client-side over the first
// ten reviews only; it is a server query now, paged.
// ============================================================================

const PAGE = 10;

const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={colors.star}
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  );
};

const DoctorReviewsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [filter, setFilter] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, { refresh = false }: { refresh?: boolean } = {}) => {
      if (nextPage === 1 && refresh) setRefreshing(true);
      if (nextPage > 1) setLoadingMore(true);
      const res = await fetchDoctorReviews({ rating: filter ?? undefined, page: nextPage, limit: PAGE });
      setRefreshing(false);
      setLoadingMore(false);
      if (!res.success) {
        setError(res.message || "We couldn't load your reviews");
        if (nextPage === 1) setStatus((s) => (s === 'ready' && reviews.length ? 'ready' : 'error'));
        return;
      }
      setError(null);
      setStats(res.data.stats);
      setReviews((prev) => (nextPage === 1 ? res.data.reviews : [...prev, ...res.data.reviews]));
      setPage(nextPage);
      setPages(res.data.pagination.pages || 1);
      setStatus('ready');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter]
  );

  useEffect(() => {
    setStatus('loading');
    load(1);
  }, [load]);

  const breakdownMax = stats ? Math.max(...Object.values(stats.breakdown), 1) : 1;

  const header = (
    <View>
      {stats && (
        <Card elevation="raised">
          <View style={styles.summary}>
            <View style={styles.average}>
              <Text style={styles.averageValue}>{stats.total ? stats.average.toFixed(1) : '—'}</Text>
              <Stars rating={stats.average} size={16} />
              <Text style={styles.caption}>
                {stats.total} review{stats.total === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.breakdown}>
              {(['5', '4', '3', '2', '1'] as const).map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.barRow}
                  onPress={() => setFilter((f) => (f === Number(star) ? null : Number(star)))}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} stars, ${stats.breakdown[star]} reviews. Filter`}
                >
                  <Text style={styles.barLabel}>{star}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.round((stats.breakdown[star] / breakdownMax) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{stats.breakdown[star]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} style={styles.chip} />
        {[5, 4, 3, 2, 1].map((star) => (
          <Chip
            key={star}
            label={`${star} star${star === 1 ? '' : 's'}`}
            selected={filter === star}
            onPress={() => setFilter(star)}
            style={styles.chip}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen>
      <AppBar title="Reviews" onBack={() => navigation.goBack()} />
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(1, { refresh: true })} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <SkeletonCard lines={2} />
          ) : status === 'error' ? (
            <ErrorState message={error} onRetry={() => load(1)} />
          ) : (
            <EmptyState
              icon="star-outline"
              title={filter ? `No ${filter}-star reviews` : 'No reviews yet'}
              message={filter ? 'Clear the filter to see all of your reviews.' : 'Patients can review you after a completed consultation.'}
            />
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.review}>
            <View style={styles.reviewHeader}>
              <Avatar uri={item.patientPhoto} name={item.patientName} size={36} />
              <View style={styles.reviewWho}>
                <Text style={styles.strong} numberOfLines={1}>
                  {item.patientName}
                </Text>
                <Text style={styles.caption}>
                  {item.createdAt ? formatDateLabel(dateKeyOf(new Date(item.createdAt)), { weekday: false, year: true }) : ''}
                </Text>
              </View>
              <Stars rating={item.rating} />
            </View>
            {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
          </Card>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (status === 'ready' && !loadingMore && page < pages) load(page + 1);
        }}
        ListFooterComponent={
          <View style={styles.footer}>{loadingMore && <ActivityIndicator color={colors.accent} />}</View>
        }
      />
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    summary: { flexDirection: 'row', alignItems: 'center' },
    average: { alignItems: 'center', marginRight: S.xl, minWidth: 88 },
    averageValue: { ...T.display, color: c.ink },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    strong: { ...T.bodyStrong, color: c.ink },
    breakdown: { flex: 1 },
    barRow: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
    barLabel: { ...T.caption, color: c.inkMuted, width: 14 },
    barTrack: { flex: 1, height: 6, borderRadius: R.pill, backgroundColor: c.surfaceSunken, marginHorizontal: S.sm, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: R.pill, backgroundColor: c.star },
    barCount: { ...T.caption, color: c.inkMuted, width: 24, textAlign: 'right' },
    filters: { paddingVertical: S.md },
    chip: { marginRight: S.sm },
    review: { marginBottom: S.md },
    reviewHeader: { flexDirection: 'row', alignItems: 'center' },
    reviewWho: { flex: 1, marginHorizontal: S.md },
    comment: { ...T.body, color: c.ink, marginTop: S.md },
    footer: { height: S.huge * 2, alignItems: 'center', justifyContent: 'center' },
  });

export default DoctorReviewsScreen;
