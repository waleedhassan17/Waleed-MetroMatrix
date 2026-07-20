import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
  Trash2,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius } from '../../../../constants/Colors';
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
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';
import ProductCard, { ProductCardSkeleton } from '../../../../components/Shopping/ProductCard';
import { useProductGridSizing } from '../../../../hooks/useProductGridSizing';

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
  const wishlistItems = useAppSelector(selectWishlistItems);
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.productId)), [wishlistItems]);
  const { cardWidth, imageHeight } = useProductGridSizing();

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

  const handleToggleWishlist = useCallback((item: Product) => {
    dispatch(toggleWishlistItem({
      productId: item.productId,
      productName: item.name,
      productImage: item.images?.[0] ?? '',
      brandId: item.brandId,
      brandName: item.brandId,
      price: item.salePrice ?? item.basePrice,
      originalPrice: item.salePrice ? item.basePrice : undefined,
    }));
  }, [dispatch]);

  const renderProductResult = ({ item }: { item: Product }) => (
    <ProductCard
      product={{
        productId: item.productId,
        brandId: item.brandId,
        name: item.name,
        image: item.images?.[0],
        basePrice: item.basePrice,
        salePrice: item.salePrice,
        rating: item.rating,
        totalReviews: item.totalReviews,
        inStock: item.inStock,
        isNewArrival: item.isNewArrival,
      }}
      width={cardWidth}
      imageHeight={imageHeight}
      onPress={navigateToProductDetail}
      onWishlist={() => handleToggleWishlist(item)}
      isWishlisted={wishlistIds.has(item.productId)}
    />
  );

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
            <FlatList
              data={Array.from({ length: 6 })}
              keyExtractor={(_, i) => `skeleton-${i}`}
              renderItem={() => <ProductCardSkeleton width={cardWidth} imageHeight={imageHeight} />}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
              contentContainerStyle={styles.resultsList}
              scrollEnabled={false}
            />
          ) : (
            <FlatList
              data={results}
              renderItem={renderProductResult}
              keyExtractor={(item) => item.productId}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: (StatusBar.currentHeight || 0) + 20,
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  resultCountText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    paddingVertical: Spacing.sm,
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
