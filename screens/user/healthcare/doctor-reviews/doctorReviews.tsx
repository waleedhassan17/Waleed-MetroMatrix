import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchReviews,
  loadMoreReviews,
  setFilterRating,
  setSortBy,
  resetReviews,
  selectFilteredReviews,
  selectReviewStats,
} from './doctorReviewsSlice';
import type { FilterRating, SortOption } from './doctorReviewsSlice';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { DoctorReview } from '../../../../models/healthcare/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Theme Colors (Consistent) ───────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FBBF24',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    accent: ['#5A9FFF', '#2A7FFF'],
  },
};

// ── Rating filter chips ─────────────────────

const RATING_FILTERS: { value: FilterRating; label: string; icon?: string }[] = [
  { value: 0, label: 'All' },
  { value: 5, label: '5', icon: 'star' },
  { value: 4, label: '4', icon: 'star' },
  { value: 3, label: '3', icon: 'star' },
  { value: 2, label: '2', icon: 'star' },
  { value: 1, label: '1', icon: 'star' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
];

// ── Skeleton Component ──────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  );
};

const ReviewCardSkeleton: React.FC = () => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <SkeletonBox width={44} height={44} borderRadius={14} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="40%" height={10} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={70} height={20} borderRadius={10} />
    </View>
    <SkeletonBox width="100%" height={14} style={{ marginTop: 14 }} />
    <SkeletonBox width="80%" height={14} style={{ marginTop: 6 }} />
  </View>
);

// ── Star Rating Display ─────────────────────

const StarRating: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 14,
}) => {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={i < Math.round(rating) ? THEME.star : '#CBD5E1'}
        />
      ))}
    </View>
  );
};

// ── Rating Bar Component ────────────────────

const RatingBar: React.FC<{
  stars: number;
  count: number;
  total: number;
  isActive: boolean;
  onPress: () => void;
}> = ({ stars, count, total, isActive, onPress }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: percentage,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  return (
    <TouchableOpacity
      style={[styles.ratingBarRow, isActive && styles.ratingBarRowActive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.ratingBarLabel}>{stars}</Text>
      <Ionicons name="star" size={12} color={THEME.star} />
      <View style={styles.ratingBarTrack}>
        <Animated.View
          style={[
            styles.ratingBarFill,
            isActive && styles.ratingBarFillActive,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.ratingBarCount}>{count}</Text>
    </TouchableOpacity>
  );
};

// ── Main Component ──────────────────────────

const DoctorReviewsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const [refreshing, setRefreshing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    ratingBreakdown,
    filterRating,
    sortBy,
    loading,
    loadingMore,
    error,
    pagination,
  } = useAppSelector((s) => s.doctorReviews);
  const reviews = useAppSelector(selectFilteredReviews);
  const stats = useAppSelector(selectReviewStats);

  const doctorId: string = route.params?.doctorId ?? '';
  const doctorName: string = route.params?.doctorName ?? 'Doctor';

  // ── Lifecycle ───────────────────────────

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    if (doctorId) {
      dispatch(fetchReviews(doctorId));
    }

    return () => {
      dispatch(resetReviews());
    };
  }, [doctorId, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchReviews(doctorId));
    setRefreshing(false);
  }, [dispatch, doctorId]);

  const handleLoadMore = () => {
    if (!loadingMore && pagination.hasNext && filterRating === 0) {
      dispatch(loadMoreReviews());
    }
  };

  const handleFilterPress = (rating: FilterRating) => {
    dispatch(setFilterRating(filterRating === rating ? 0 : rating));
  };

  // ── Rating Summary Header ───────────────

  const renderRatingSummary = () => (
    <View style={styles.summaryCard}>
      {/* Left: Big Rating */}
      <View style={styles.summaryLeft}>
        <Text style={styles.bigRating}>
          {ratingBreakdown.average?.toFixed(1) || '–'}
        </Text>
        <StarRating rating={ratingBreakdown.average || 0} size={16} />
        <View style={styles.totalReviewsBadge}>
          <Ionicons name="chatbubbles-outline" size={12} color={THEME.primary} />
          <Text style={styles.totalReviewsText}>
            {ratingBreakdown.total} reviews
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.summaryDivider} />

      {/* Right: Rating Bars */}
      <View style={styles.summaryRight}>
        {([5, 4, 3, 2, 1] as const).map((s) => (
          <RatingBar
            key={s}
            stars={s}
            count={ratingBreakdown[s]}
            total={ratingBreakdown.total}
            isActive={filterRating === s}
            onPress={() => handleFilterPress(s)}
          />
        ))}
      </View>
    </View>
  );

  // ── Stats Cards ─────────────────────────

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.statIconBg, { backgroundColor: '#DCFCE7' }]}>
          <Ionicons name="thumbs-up" size={16} color={THEME.success} />
        </View>
        <Text style={styles.statValue}>{stats.positivePercentage}%</Text>
        <Text style={styles.statLabel}>Positive</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="chatbubble-ellipses" size={16} color={THEME.warning} />
        </View>
        <Text style={styles.statValue}>{stats.withComments}</Text>
        <Text style={styles.statLabel}>With Comments</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIconBg, { backgroundColor: '#D6E8FF' }]}>
          <MaterialCommunityIcons name="reply" size={16} color={THEME.accent} />
        </View>
        <Text style={styles.statValue}>{stats.withResponses}</Text>
        <Text style={styles.statLabel}>Responded</Text>
      </View>
    </View>
  );

  // ── Filter Chips ────────────────────────

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <FlatList
        data={RATING_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        keyExtractor={(item) => String(item.value)}
        renderItem={({ item }) => {
          const active = filterRating === item.value;
          return (
            <TouchableOpacity
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => handleFilterPress(item.value)}
              activeOpacity={0.7}
            >
              {item.icon && (
                <Ionicons
                  name={item.icon as any}
                  size={12}
                  color={active ? '#FFFFFF' : THEME.star}
                />
              )}
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortModal(true)}
      >
        <MaterialCommunityIcons
          name="sort-variant"
          size={18}
          color={THEME.primary}
        />
      </TouchableOpacity>
    </View>
  );

  // ── Review Card ─────────────────────────

  const renderReviewCard = useCallback(
    ({ item, index }: { item: DoctorReview; index: number }) => {
      const reviewDate = new Date(item.createdAt);
      const isRecent =
        Date.now() - reviewDate.getTime() < 7 * 24 * 60 * 60 * 1000;

      return (
        <Animated.View
          style={[
            styles.reviewCard,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <LinearGradient
                colors={['#F1F5F9', '#E2E8F0']}
                style={styles.reviewAvatarGradient}
              >
                <Text style={styles.reviewAvatarText}>
                  {item.isAnonymous ? 'A' : 'P'}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.reviewMeta}>
              <View style={styles.reviewAuthorRow}>
                <Text style={styles.reviewAuthor}>
                  {item.isAnonymous ? 'Anonymous Patient' : 'Verified Patient'}
                </Text>
                {!item.isAnonymous && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={THEME.success}
                    />
                  </View>
                )}
              </View>
              <View style={styles.reviewDateRow}>
                <Text style={styles.reviewDate}>
                  {reviewDate.toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {isRecent && (
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>Recent</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.reviewRatingBadge}>
              <Ionicons name="star" size={12} color={THEME.star} />
              <Text style={styles.reviewRatingText}>{item.rating}</Text>
            </View>
          </View>

          {/* Comment */}
          <Text style={styles.reviewComment}>{item.comment}</Text>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.reviewTags}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.reviewTag}>
                  <Text style={styles.reviewTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Doctor Response */}
          {item.response && (
            <View style={styles.responseBox}>
              <View style={styles.responseHeader}>
                <View style={styles.responseIconBg}>
                  <MaterialCommunityIcons
                    name="stethoscope"
                    size={12}
                    color={THEME.primary}
                  />
                </View>
                <Text style={styles.responseLabel}>Doctor's Response</Text>
                <Text style={styles.responseDate}>
                  {new Date(item.response.respondedAt).toLocaleDateString(
                    'en-PK',
                    { day: 'numeric', month: 'short' }
                  )}
                </Text>
              </View>
              <Text style={styles.responseText}>{item.response.text}</Text>
            </View>
          )}

          {/* Helpful Actions */}
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.helpfulButton}>
              <Ionicons
                name="thumbs-up-outline"
                size={14}
                color={Colors.text.tertiary}
              />
              <Text style={styles.helpfulText}>Helpful</Text>
              {(item.helpfulCount ?? 0) > 0 && (
                <Text style={styles.helpfulCount}>({item.helpfulCount})</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.reportButton}>
              <Ionicons
                name="flag-outline"
                size={14}
                color={Colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    },
    [fadeAnim]
  );

  // ── Footer ──────────────────────────────

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <View style={styles.loadingDot} />
        <Text style={styles.loadingText}>Loading more reviews...</Text>
      </View>
    );
  };

  // ── Empty ───────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons
            name="comment-text-multiple-outline"
            size={48}
            color="#94A3B8"
          />
        </View>
        <Text style={styles.emptyTitle}>
          {filterRating > 0 ? `No ${filterRating}-Star Reviews` : 'No Reviews Yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {filterRating > 0
            ? 'Try selecting a different rating filter to see more reviews.'
            : 'Be the first to share your experience with this doctor.'}
        </Text>
        {filterRating > 0 && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => dispatch(setFilterRating(0))}
          >
            <Text style={styles.clearFilterText}>Show All Reviews</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── List Header ─────────────────────────

  const renderListHeader = () => (
    <>
      {renderRatingSummary()}
      {renderStatsCards()}
      {renderFilterChips()}
      <View style={styles.reviewsHeaderRow}>
        <Text style={styles.reviewsTitle}>
          {filterRating > 0
            ? `${filterRating}-Star Reviews`
            : 'All Reviews'}
        </Text>
        <Text style={styles.reviewsCount}>
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </Text>
      </View>
    </>
  );

  // ── Error State ─────────────────────────

  if (error && !loading && reviews.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonError}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.errorHeaderTitle}>Reviews</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={THEME.error} />
          </View>
          <Text style={styles.errorTitle}>Couldn't Load Reviews</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dispatch(fetchReviews(doctorId))}
          >
            <LinearGradient
              colors={THEME.gradient.primary as any}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ─────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* Header */}
      <LinearGradient
        colors={THEME.gradient.header as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Patient Reviews</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Dr. {doctorName}
            </Text>
          </View>

          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {loading && reviews.length === 0 ? (
          <FlatList
            data={[1, 2, 3]}
            renderItem={() => <ReviewCardSkeleton />}
            keyExtractor={(item) => String(item)}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={reviews}
            renderItem={renderReviewCard}
            keyExtractor={(item) => item.reviewId}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[THEME.primary]}
                tintColor={THEME.primary}
              />
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
  },
  bigRating: {
    fontSize: 44,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 52,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
  totalReviewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  totalReviewsText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.primary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 10,
  },
  summaryRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },

  // Rating Bar
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  ratingBarRowActive: {
    backgroundColor: '#FFFBEB',
  },
  ratingBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    width: 12,
    textAlign: 'right',
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: THEME.star,
  },
  ratingBarFillActive: {
    backgroundColor: '#F59E0B',
  },
  ratingBarCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    width: 28,
    textAlign: 'right',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterScroll: {
    paddingRight: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  // Reviews Header
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reviewsCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },

  // Review Card
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    marginRight: 12,
  },
  reviewAvatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  verifiedBadge: {},
  reviewDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  recentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.success,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewComment: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  reviewTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  // Response
  responseBox: {
    marginTop: 14,
    backgroundColor: THEME.primaryLight,
    borderRadius: 12,
    padding: 14,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  responseIconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  responseDate: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  responseText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  // Actions
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  helpfulText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  helpfulCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  reportButton: {
    padding: 4,
  },

  // Footer
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.primary,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFilterButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Error
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButtonError: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DoctorReviewsScreen;