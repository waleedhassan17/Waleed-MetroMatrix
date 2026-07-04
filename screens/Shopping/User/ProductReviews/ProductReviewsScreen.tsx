import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Star, Camera, X } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { ProductReview } from '../../../../types/shopping';
import {
  fetchReviews,
  loadMoreReviews,
  setFilterRating,
  togglePhotosOnly,
  resetProductReviews,
  selectFilteredReviews,
  selectProductReviewsState,
  selectRatingBreakdown,
  selectReviewsLoading,
  selectFilterRating,
  selectHasPhotosOnly,
} from './productReviewsSlice';

const ShopColors = {
  primary: '#E67E22',
  primaryLight: '#FFF3E6',
  accent: '#F39C12',
};

const STAR_LABELS = ['', '1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'];

const ProductReviewsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const productId = route.params?.productId as string;

  const reviews = useAppSelector(selectFilteredReviews);
  const { averageRating, totalReviews, loadingMore, hasMore } = useAppSelector(selectProductReviewsState);
  const ratingBreakdown = useAppSelector(selectRatingBreakdown);
  const loading = useAppSelector(selectReviewsLoading);
  const filterRating = useAppSelector(selectFilterRating);
  const hasPhotosOnly = useAppSelector(selectHasPhotosOnly);

  useEffect(() => {
    if (productId) {
      dispatch(fetchReviews({ productId, page: 1, refresh: true }));
    }
    return () => {
      dispatch(resetProductReviews());
    };
  }, [dispatch, productId]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && productId) {
      dispatch(loadMoreReviews(productId));
    }
  }, [dispatch, hasMore, loadingMore, productId]);

  const handleFilterRating = useCallback((rating: number | null) => {
    dispatch(setFilterRating(filterRating === rating ? null : rating));
  }, [dispatch, filterRating]);

  // Max count in breakdown for bar widths
  const maxBreakdownCount = useMemo(() => {
    return Math.max(1, ...Object.values(ratingBreakdown));
  }, [ratingBreakdown]);

  // ── Render Review Card ────────────────────

  const renderReviewCard = ({ item }: { item: ProductReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserRow}>
          {item.userAvatar ? (
            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {item.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.userName}>{item.userName}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  stroke={ShopColors.accent}
                  fill={s <= item.rating ? ShopColors.accent : 'none'}
                  strokeWidth={1.5}
                />
              ))}
              {item.isVerifiedPurchase && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>

      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      <Text style={styles.reviewComment}>{item.comment}</Text>

      {/* Review Images */}
      {item.images && item.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesRow}>
          {item.images.map((img, i) => (
            <Image key={i} source={{ uri: img }} style={styles.reviewImage} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 80 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={ShopColors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <TouchableOpacity
          style={styles.writeBtn}
          onPress={() => navigation.navigate(ShoppingRouteNames.WriteReview, { productId })}
        >
          <Text style={styles.writeBtnText}>Write</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ShopColors.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewCard}
          keyExtractor={(item) => item.reviewId}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <>
              {/* ── Rating Summary ──────────────── */}
              <View style={styles.summarySection}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.avgRating}>{averageRating.toFixed(1)}</Text>
                  <View style={styles.summaryStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        stroke={ShopColors.accent}
                        fill={s <= Math.round(averageRating) ? ShopColors.accent : 'none'}
                        strokeWidth={1.5}
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviewsText}>{totalReviews} reviews</Text>
                </View>

                {/* Star Breakdown Bars */}
                <View style={styles.breakdownRight}>
                  {([5, 4, 3, 2, 1] as const).map((rating) => {
                    const count = ratingBreakdown[rating];
                    const width = (count / maxBreakdownCount) * 100;
                    return (
                      <TouchableOpacity
                        key={rating}
                        style={styles.breakdownRow}
                        onPress={() => handleFilterRating(rating)}
                      >
                        <Text style={styles.breakdownLabel}>{rating}</Text>
                        <Star size={10} stroke={ShopColors.accent} fill={ShopColors.accent} strokeWidth={1.5} />
                        <View style={styles.breakdownBarBg}>
                          <View
                            style={[
                              styles.breakdownBarFill,
                              { width: `${width}%` },
                              filterRating === rating && { backgroundColor: ShopColors.primary },
                            ]}
                          />
                        </View>
                        <Text style={styles.breakdownCount}>{count}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── Filters ────────────────────── */}
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  {/* Photos only toggle */}
                  <TouchableOpacity
                    style={[styles.filterChip, hasPhotosOnly && styles.filterChipActive]}
                    onPress={() => dispatch(togglePhotosOnly())}
                  >
                    <Camera size={13} stroke={hasPhotosOnly ? '#FFF' : Colors.text.secondary} strokeWidth={1.75} />
                    <Text style={[styles.filterChipText, hasPhotosOnly && styles.filterChipTextActive]}>
                      With Photos
                    </Text>
                  </TouchableOpacity>

                  {/* Rating filters */}
                  {[5, 4, 3, 2, 1].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.filterChip, filterRating === r && styles.filterChipActive]}
                      onPress={() => handleFilterRating(r)}
                    >
                      <Star
                        size={12}
                        stroke={filterRating === r ? '#FFF' : ShopColors.accent}
                        fill={filterRating === r ? '#FFF' : ShopColors.accent}
                        strokeWidth={1.5}
                      />
                      <Text style={[styles.filterChipText, filterRating === r && styles.filterChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Clear filters */}
                  {(filterRating !== null || hasPhotosOnly) && (
                    <TouchableOpacity
                      style={styles.clearFilterBtn}
                      onPress={() => {
                        dispatch(setFilterRating(null));
                        if (hasPhotosOnly) dispatch(togglePhotosOnly());
                      }}
                    >
                      <X size={14} stroke={ShopColors.primary} strokeWidth={2} />
                      <Text style={styles.clearFilterText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No reviews found</Text>
              <Text style={styles.emptySubtitle}>
                {filterRating || hasPhotosOnly
                  ? 'Try changing your filters'
                  : 'Be the first to review this product'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeBtn: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // Summary
  summarySection: {
    flexDirection: 'row',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    gap: Spacing.xl,
  },
  summaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  avgRating: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  summaryStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  totalReviewsText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  breakdownRight: {
    flex: 1,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownLabel: {
    width: 12,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  breakdownBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.backgroundAlt,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: ShopColors.accent,
  },
  breakdownCount: {
    width: 24,
    fontSize: 11,
    color: Colors.text.tertiary,
    textAlign: 'right',
  },

  // Filters
  filterRow: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: ShopColors.primary,
    borderColor: ShopColors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: ShopColors.primary,
  },

  // Review Card
  reviewCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: ShopColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: ShopColors.primary,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
    marginLeft: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#27AE60',
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  reviewImagesRow: {
    marginTop: Spacing.sm,
  },
  reviewImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.backgroundAlt,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
});

export default ProductReviewsScreen;
