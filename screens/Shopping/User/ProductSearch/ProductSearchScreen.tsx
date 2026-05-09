import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Search,
  X,
  Clock,
  TrendingUp,
  Star,
  Trash2,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { Product } from '../../../../types/shopping';
import {
  setSearchQuery,
  searchProducts,
  fetchSuggestions,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  resetSearch,
  selectSearchQuery,
  selectSearchResults,
  selectRecentSearches,
  selectSuggestions,
  selectSearchLoading,
  selectProductSearch,
  POPULAR_SEARCHES,
} from './productSearchSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ShopColors = {
  primary: '#E67E22',
  primaryLight: '#FFF3E6',
  accent: '#F39C12',
};

const ProductSearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const brandId = route.params?.brandId as string | undefined;
  const query = useAppSelector(selectSearchQuery);
  const results = useAppSelector(selectSearchResults);
  const recentSearches = useAppSelector(selectRecentSearches);
  const suggestions = useAppSelector(selectSuggestions);
  const loading = useAppSelector(selectSearchLoading);
  const { hasSearched, hasMore, page } = useAppSelector(selectProductSearch);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      clearTimeout(timer);
      dispatch(resetSearch());
    };
  }, [dispatch]);

  // Debounced suggestions
  const handleQueryChange = useCallback((text: string) => {
    dispatch(setSearchQuery(text));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        dispatch(fetchSuggestions(text));
        dispatch(searchProducts({ query: text, page: 1, brandId }));
      }, 400);
    }
  }, [dispatch, brandId]);

  const handleSubmitSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    dispatch(addRecentSearch(q));
    dispatch(searchProducts({ query: q, page: 1, brandId }));
  }, [dispatch, query, brandId]);

  const handleSearchFromTag = useCallback((text: string) => {
    dispatch(setSearchQuery(text));
    dispatch(addRecentSearch(text));
    dispatch(searchProducts({ query: text, page: 1, brandId }));
    Keyboard.dismiss();
  }, [dispatch, brandId]);

  const handleClearQuery = useCallback(() => {
    dispatch(resetSearch());
    inputRef.current?.focus();
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading && query.trim()) {
      dispatch(searchProducts({ query: query.trim(), page: page + 1, brandId }));
    }
  }, [dispatch, hasMore, loading, query, page, brandId]);

  const navigateToProductDetail = (productId: string, pBrandId: string) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, { productId, brandId: pBrandId });
  };

  // Show suggestions panel when user is typing but hasn't submitted
  const showPreSearch = !hasSearched || query.trim().length === 0;

  // ── Render Product Result ─────────────────

  const renderProductResult = ({ item }: { item: Product }) => {
    const hasDiscount = item.salePrice && item.salePrice < item.basePrice;
    return (
      <TouchableOpacity
        style={styles.resultRow}
        activeOpacity={0.7}
        onPress={() => navigateToProductDetail(item.productId, item.brandId)}
      >
        <Image source={{ uri: item.images[0] }} style={styles.resultImage} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.resultRating}>
            <Star size={11} stroke={ShopColors.accent} fill={ShopColors.accent} />
            <Text style={styles.resultRatingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.resultReviewCount}>({item.totalReviews})</Text>
          </View>
          <View style={styles.resultPriceRow}>
            <Text style={styles.resultPrice}>
              PKR {hasDiscount ? item.salePrice!.toLocaleString() : item.basePrice.toLocaleString()}
            </Text>
            {hasDiscount && (
              <Text style={styles.resultOriginalPrice}>PKR {item.basePrice.toLocaleString()}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading || results.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={ShopColors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ── Search Header ───────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.searchInputWrap}>
          <Search size={16} stroke={Colors.text.tertiary} strokeWidth={1.75} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.text.tertiary}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} stroke={Colors.text.tertiary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showPreSearch ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.preSearchContent}
          ListHeaderComponent={
            <>
              {/* ── Suggestions ────────────────── */}
              {suggestions.length > 0 && query.trim().length > 0 && (
                <View style={styles.section}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={`sug-${i}`}
                      style={styles.suggestionRow}
                      onPress={() => handleSearchFromTag(s)}
                    >
                      <Search size={14} stroke={Colors.text.tertiary} strokeWidth={1.75} />
                      <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Recent Searches ────────────── */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={() => dispatch(clearRecentSearches())}>
                      <Trash2 size={16} stroke={Colors.text.tertiary} strokeWidth={1.75} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagWrap}>
                    {recentSearches.map((s, i) => (
                      <TouchableOpacity
                        key={`recent-${i}`}
                        style={styles.recentTag}
                        onPress={() => handleSearchFromTag(s)}
                        onLongPress={() => dispatch(removeRecentSearch(s))}
                      >
                        <Clock size={12} stroke={Colors.text.tertiary} strokeWidth={1.75} />
                        <Text style={styles.recentTagText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Popular Searches ───────────── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Popular Searches</Text>
                </View>
                <View style={styles.tagWrap}>
                  {POPULAR_SEARCHES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.popularTag}
                      onPress={() => handleSearchFromTag(s)}
                    >
                      <TrendingUp size={12} stroke={ShopColors.primary} strokeWidth={1.75} />
                      <Text style={styles.popularTagText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
        />
      ) : (
        <>
          {/* ── Live Results ────────────────── */}
          {loading && results.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={ShopColors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderProductResult}
              keyExtractor={(item) => item.productId}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderFooter}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                results.length > 0 ? (
                  <Text style={styles.resultCountText}>{results.length} results</Text>
                ) : null
              }
              ListEmptyComponent={
                hasSearched && !loading ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No results found</Text>
                    <Text style={styles.emptySubtitle}>Try a different search term</Text>
                  </View>
                ) : null
              }
            />
          )}
        </>
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
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.text.tertiary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: (StatusBar.currentHeight || 0) + 8,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    paddingVertical: 0,
  },

  // Pre-search
  preSearchContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Suggestions
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },

  // Tags
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundAlt,
  },
  recentTagText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: ShopColors.primaryLight,
  },
  popularTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: ShopColors.primary,
  },

  // Results
  resultsList: {
    paddingBottom: 100,
  },
  resultCountText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  resultImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundAlt,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 19,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  resultRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  resultReviewCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  resultPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  resultPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: ShopColors.primary,
  },
  resultOriginalPrice: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
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

export default ProductSearchScreen;
