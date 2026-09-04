import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, ShoppingCart, Search, SlidersHorizontal } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import useBrandTheme from '../../../../hooks/useBrandTheme';
import { ThemeProvider } from '../../../../theme';
import { useProductGridSizing } from '../../../../hooks/useProductGridSizing';
import type { Product, Category } from '../../../../types/shopping';
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';
import { selectCartItemCount } from '../Cart/cartSlice';
import { ErrorState } from '../../../../components/Shopping/ScreenState';
import ProductCard, { ProductCardSkeleton } from '../../../../components/Shopping/ProductCard';
import { RawIcon } from '../../../../components/Icon';
import { getCategoryIcon } from '../../../../constants/icons';
import {
  fetchBrandStore,
  fetchBrandProducts,
  setSelectedCategory,
  setSortBy,
  resetBrandStore,
  selectBrandStore,
  selectBrandStoreBrand,
  selectBrandStoreProducts,
  selectBrandStoreCategories,
  selectBrandStoreSelectedCategory,
  selectBrandStoreLoading,
} from './brandStoreSlice';

const BANNER_HEIGHT = 200;

const BrandStoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const brandId = route.params?.brandId as string;

  const brand = useAppSelector(selectBrandStoreBrand);
  const products = useAppSelector(selectBrandStoreProducts);
  const categories = useAppSelector(selectBrandStoreCategories);
  const selectedCategory = useAppSelector(selectBrandStoreSelectedCategory);
  const loading = useAppSelector(selectBrandStoreLoading);
  const { refreshing, productsLoading, hasMore, page, sortBy, error } = useAppSelector(selectBrandStore);

  // Dynamic theming from brand config
  const theme = useBrandTheme(brand);
  // Was hardcoded to 0 ("will be wired to cart slice later"), so the cart badge
  // on the brand store never showed anything however full the cart was.
  const cartItemCount = useAppSelector(selectCartItemCount);
  const wishlistItems = useAppSelector(selectWishlistItems);
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.productId)), [wishlistItems]);
  const { cardWidth, imageHeight } = useProductGridSizing();

  // Which top-level (gender) tab's sub-category row is showing — separate
  // from selectedCategory, since selecting a sub-category (e.g. "T-Shirts")
  // must keep that parent's row expanded rather than collapsing it.
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  useEffect(() => {
    if (brandId) {
      dispatch(fetchBrandStore(brandId));
    }
    return () => {
      dispatch(resetBrandStore());
    };
  }, [dispatch, brandId]);

  const handleRefresh = useCallback(() => {
    if (brandId) {
      dispatch(fetchBrandProducts({
        brandId,
        page: 1,
        categoryId: selectedCategory || undefined,
        sortBy,
        refresh: true,
      }));
    }
  }, [dispatch, brandId, selectedCategory, sortBy]);

  const handleLoadMore = useCallback(() => {
    if (!productsLoading && hasMore && brandId) {
      dispatch(fetchBrandProducts({
        brandId,
        page: page + 1,
        categoryId: selectedCategory || undefined,
        sortBy,
      }));
    }
  }, [dispatch, brandId, productsLoading, hasMore, page, selectedCategory, sortBy]);

  const handleCategorySelect = useCallback((catId: string | null) => {
    dispatch(setSelectedCategory(catId));
    if (brandId) {
      dispatch(fetchBrandProducts({
        brandId,
        page: 1,
        categoryId: catId || undefined,
        sortBy,
        refresh: true,
      }));
    }
  }, [dispatch, brandId, sortBy]);

  const handleSortChange = useCallback((sort: typeof sortBy) => {
    dispatch(setSortBy(sort));
    if (brandId) {
      dispatch(fetchBrandProducts({
        brandId,
        page: 1,
        categoryId: selectedCategory || undefined,
        sortBy: sort,
        refresh: true,
      }));
    }
  }, [dispatch, brandId, selectedCategory]);

  const navigateToProductDetail = (productId: string, pBrandId?: string) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, { productId, brandId: pBrandId || brandId });
  };

  const navigateToSearch = () => {
    navigation.navigate(ShoppingRouteNames.SearchProducts, { brandId });
  };

  const navigateToCart = () => {
    navigation.navigate(ShoppingRouteNames.Cart);
  };

  // ── Render Helpers ────────────────────────

  const renderCategoryTab = ({ item, isAll }: { item?: Category; isAll?: boolean }) => {
    const id = isAll ? null : item?.categoryId || null;
    const label = isAll ? 'All' : item?.name || '';
    const isActive = isAll ? selectedCategory === null && expandedParentId === null : expandedParentId === id;
    const tabBackgroundColor = isActive ? theme.primaryColor : Colors.surface;
    const tabBorderColor = isActive ? theme.primaryColor : Colors.border;
    const tabTextColor = isActive ? theme.textOnPrimary : Colors.text.primary;

    return (
      <TouchableOpacity
        style={[
          styles.categoryTab,
          { backgroundColor: tabBackgroundColor, borderColor: tabBorderColor },
        ]}
        onPress={() => {
          setExpandedParentId(id);
          handleCategorySelect(id);
        }}
      >
        <Text
          style={[styles.categoryTabText, { color: tabTextColor }]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const expandedParent = categories.find((c) => c.categoryId === expandedParentId);

  const renderSubCategoryChip = (item?: Category) => {
    const id = item ? item.categoryId : expandedParentId;
    const label = item ? item.name : `All ${expandedParent?.name || ''}`;
    const icon = item ? getCategoryIcon(item.name) : null;
    const isActive = selectedCategory === id;
    return (
      <TouchableOpacity
        key={id || 'sub-all'}
        style={[
          styles.subCategoryChip,
          isActive && { backgroundColor: `${theme.primaryColor}15`, borderColor: theme.primaryColor },
        ]}
        onPress={() => handleCategorySelect(id)}
      >
        {icon && (
          <RawIcon
            icon={icon}
            size="sm"
            color={isActive ? theme.primaryColor : Colors.text.secondary}
          />
        )}
        <Text style={[styles.subCategoryChipText, isActive && { color: theme.primaryColor, fontWeight: '600' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductCard = ({ item }: { item: Product }) => (
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
      onWishlist={() => dispatch(toggleWishlistItem({
        productId: item.productId,
        productName: item.name,
        productImage: item.images?.[0] ?? '',
        brandId: item.brandId,
        brandName: item.brandId,
        price: item.salePrice ?? item.basePrice,
        originalPrice: item.salePrice ? item.basePrice : undefined,
      }))}
      isWishlisted={wishlistIds.has(item.productId)}
    />
  );

  const renderEmpty = () => {
    if (productsLoading || loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No products yet</Text>
        <Text style={styles.emptySubtitle}>This brand hasn't added any products</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!productsLoading || products.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primaryColor} />
      </View>
    );
  };

  // ── Sort options ──────────────────────────
  const SORT_OPTIONS: { key: typeof sortBy; label: string }[] = [
    { key: 'popular', label: 'Popular' },
    { key: 'newest', label: 'New' },
    { key: 'price_asc', label: 'Price ↑' },
    { key: 'price_desc', label: 'Price ↓' },
    { key: 'rating', label: 'Rating' },
  ];

  if (loading && !brand) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.text.tertiary} />
      </View>
    );
  }

  // The slice has always tracked `error`, but nothing rendered it: a failed
  // brand-store load left a blank screen with no explanation and no way back.
  if (error && !brand) {
    return (
      <ErrorState
        title="Couldn't load this store"
        message={error}
        onRetry={() => {
          dispatch(fetchBrandStore(brandId));
          dispatch(fetchBrandProducts({ brandId, page: 1 }));
        }}
      />
    );
  }

  return (
    // The inline `theme` below still paints this screen's own chrome. The
    // provider is what reaches BELOW it: ProductCard, the empty and error
    // states, and anything else shared now render in this brand's colours
    // without knowing whose store they are in.
    <ThemeProvider module="shopping" brand={brand}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primaryColor} />

      {/* ── Brand Banner ────────────────────── */}
      <View style={[styles.bannerWrap, { backgroundColor: theme.primaryColor }]}>
        {brand?.bannerImage && (
          <Image source={{ uri: brand.bannerImage }} style={styles.bannerImage} />
        )}
        <View style={styles.bannerOverlay} />

        {/* Header over banner */}
        <View style={styles.bannerHeader}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={22} stroke="#FFF" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.bannerHeaderRight}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={navigateToSearch}>
              <Search size={20} stroke="#FFF" strokeWidth={1.75} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={navigateToCart}>
              <ShoppingCart size={20} stroke="#FFF" strokeWidth={1.75} />
              {cartItemCount > 0 && (
                <View style={[styles.cartBadge, { backgroundColor: theme.accentColor }]}>
                  <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Brand info on banner */}
        <View style={styles.brandInfoOverlay}>
          <View style={styles.brandLogoWrap}>
            {brand?.logo && <Image source={{ uri: brand.logo }} style={styles.brandLogo} />}
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandName}>{brand?.name || ''}</Text>
            <Text style={styles.brandTagline} numberOfLines={1}>{brand?.tagline || ''}</Text>
          </View>
        </View>
      </View>

      {/* ── Category Tabs ───────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={styles.categoryRowContent}
      >
        {renderCategoryTab({ isAll: true })}
        {categories.map((cat) => (
          <View key={cat.categoryId}>
            {renderCategoryTab({ item: cat })}
          </View>
        ))}
      </ScrollView>

      {/* ── Sub-category chips (T-Shirts, Jeans, Footwear...) ─────────── */}
      {!!expandedParent?.children?.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subCategoryRow}
          contentContainerStyle={styles.subCategoryRowContent}
        >
          {renderSubCategoryChip()}
          {expandedParent.children.map((child) => (
            <View key={child.categoryId}>{renderSubCategoryChip(child)}</View>
          ))}
        </ScrollView>
      )}

      {/* ── Sort Bar ────────────────────────── */}
      <View style={styles.sortBar}>
        <SlidersHorizontal size={14} stroke={Colors.text.tertiary} strokeWidth={1.75} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortChip,
                sortBy === opt.key && { backgroundColor: `${theme.primaryColor}15`, borderColor: theme.primaryColor },
              ]}
              onPress={() => handleSortChange(opt.key)}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === opt.key && { color: theme.primaryColor, fontWeight: '600' },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Products Grid ───────────────────── */}
      {productsLoading && products.length === 0 ? (
        <FlatList
          data={Array.from({ length: 6 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <ProductCardSkeleton width={cardWidth} imageHeight={imageHeight} />}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          contentContainerStyle={styles.gridContent}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.productId}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primaryColor}
              colors={[theme.primaryColor]}
            />
          }
        />
      )}
    </View>
    </ThemeProvider>
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
    backgroundColor: Colors.background,
  },

  // Banner
  bannerWrap: {
    width: '100%',
    height: BANNER_HEIGHT,
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingHorizontal: Spacing.md,
  },
  bannerHeaderRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  brandInfoOverlay: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  brandTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Category Tabs
  categoryRow: {
    backgroundColor: Colors.surface,
    maxHeight: 52,
  },
  categoryRowContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Sub-category chips
  subCategoryRow: {
    backgroundColor: Colors.surface,
    maxHeight: 44,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subCategoryRowContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  subCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  subCategoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  // Sort Bar
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sortChipText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },

  // Product Grid
  gridContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
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

export default BrandStoreScreen;
