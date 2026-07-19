import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  SlidersHorizontal,
  Star,
  Heart,
  X,
  Check,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { Product } from '../../../../types/shopping';
import {
  fetchProducts,
  loadMore,
  setFilters,
  clearFilters,
  setSorting,
  setContext,
  resetProductList,
  selectProducts,
  selectProductList,
  selectProductFilters,
  selectProductSorting,
  selectProductListLoading,
  selectActiveFilterCount,
} from './productListSlice';
import type { SortOption, ProductFilters } from './productListSlice';
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

const ShopColors = {
  primary: '#E67E22',
  primaryLight: '#FFF3E6',
  accent: '#F39C12',
  badge: '#E74C3C',
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'newest', label: 'Newest' },
  { key: 'rating', label: 'Top Rated' },
];

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOR_OPTIONS = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Red', code: '#E74C3C' },
  { name: 'Blue', code: '#3498DB' },
  { name: 'Green', code: '#27AE60' },
  { name: 'Yellow', code: '#F1C40F' },
  { name: 'Pink', code: '#E91E63' },
  { name: 'Grey', code: '#95A5A6' },
];

const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const brandId = route.params?.brandId as string | undefined;
  const categoryId = route.params?.categoryId as string | undefined;
  const search = route.params?.search as string | undefined;

  const products = useAppSelector(selectProducts);
  const { refreshing, loadingMore, hasMore, totalResults, error } = useAppSelector(selectProductList);
  const filters = useAppSelector(selectProductFilters);
  const sorting = useAppSelector(selectProductSorting);
  const loading = useAppSelector(selectProductListLoading);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);

  const wishlistItems = useAppSelector(selectWishlistItems);
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.productId)), [wishlistItems]);

  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // Local filter state (applied on confirm)
  const [localFilters, setLocalFilters] = useState<ProductFilters>({ ...filters });

  useEffect(() => {
    dispatch(setContext({ brandId, categoryId, search }));
    dispatch(fetchProducts({ page: 1, refresh: true }));
    return () => {
      dispatch(resetProductList());
    };
  }, [dispatch, brandId, categoryId, search]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchProducts({ page: 1, refresh: true }));
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      dispatch(loadMore());
    }
  }, [dispatch, hasMore, loadingMore]);

  const handleSortSelect = useCallback((sort: SortOption) => {
    dispatch(setSorting(sort));
    setShowSort(false);
    dispatch(fetchProducts({ page: 1, refresh: true }));
  }, [dispatch]);

  const handleApplyFilters = useCallback(() => {
    dispatch(setFilters(localFilters));
    setShowFilters(false);
    dispatch(fetchProducts({ page: 1, refresh: true }));
  }, [dispatch, localFilters]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    setLocalFilters({
      minPrice: null,
      maxPrice: null,
      sizes: [],
      colors: [],
      brandId: null,
      onSale: false,
      inStock: false,
    });
    setShowFilters(false);
    dispatch(fetchProducts({ page: 1, refresh: true }));
  }, [dispatch]);

  const navigateToProductDetail = (productId: string, pBrandId: string) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, { productId, brandId: pBrandId });
  };

  // ── Render Product Card ───────────────────

  const renderProductCard = ({ item, index }: { item: Product; index: number }) => {
    const hasDiscount = item.salePrice && item.salePrice < item.basePrice;
    return (
      <TouchableOpacity
        style={[styles.productCard, index % 2 === 0 ? { marginRight: Spacing.md } : {}]}
        activeOpacity={0.7}
        onPress={() => navigateToProductDetail(item.productId, item.brandId)}
      >
        <View style={styles.productImageWrap}>
          <Image source={{ uri: item.images[0] }} style={styles.productImage} />
          {hasDiscount && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>
                {Math.round(((item.basePrice - item.salePrice!) / item.basePrice) * 100)}% OFF
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.wishlistBtn}
            activeOpacity={0.7}
            onPress={() => {
              dispatch(toggleWishlistItem({
                productId: item.productId,
                productName: item.name,
                productImage: item.images?.[0] ?? '',
                brandId: item.brandId,
                brandName: item.brandId,
                price: item.salePrice ?? item.basePrice,
                originalPrice: item.salePrice ? item.basePrice : undefined,
              }));
            }}
          >
            <Heart
              size={16}
              stroke={wishlistIds.has(item.productId) ? '#E74C3C' : Colors.text.tertiary}
              fill={wishlistIds.has(item.productId) ? '#E74C3C' : 'none'}
              strokeWidth={1.75}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.ratingRow}>
            <Star size={12} stroke={ShopColors.accent} fill={ShopColors.accent} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.totalReviews})</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              PKR {hasDiscount ? item.salePrice!.toLocaleString() : item.basePrice.toLocaleString()}
            </Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>PKR {item.basePrice.toLocaleString()}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={ShopColors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptySubtitle}>
          {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Check back later for new arrivals'}
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={handleClearFilters}>
            <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Toggle helpers for local filters ──────

  const toggleSize = (size: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const toggleColor = (color: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((c) => c !== color)
        : [...prev.colors, color],
    }));
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Products</Text>
          {totalResults > 0 && (
            <Text style={styles.resultCount}>{totalResults} items</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Sort & Filter Bar ───────────────── */}
      <View style={styles.toolBar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowSort(true)}>
          <Text style={styles.toolBtnText}>Sort</Text>
          <Text style={styles.toolBtnValue}>{SORT_OPTIONS.find((o) => o.key === sorting)?.label}</Text>
        </TouchableOpacity>

        <View style={styles.toolDivider} />

        <TouchableOpacity style={styles.toolBtn} onPress={() => { setLocalFilters({ ...filters }); setShowFilters(true); }}>
          <SlidersHorizontal size={16} stroke={Colors.text.secondary} strokeWidth={1.75} />
          <Text style={styles.toolBtnText}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Products Grid ───────────────────── */}
      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ShopColors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.productId}
          numColumns={2}
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
              tintColor={ShopColors.primary}
              colors={[ShopColors.primary]}
            />
          }
        />
      )}

      {/* ── Sort Modal ──────────────────────── */}
      <Modal visible={showSort} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSort(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSort(false)}>
                <X size={20} stroke={Colors.text.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, sorting === opt.key && styles.sortOptionActive]}
                onPress={() => handleSortSelect(opt.key)}
              >
                <Text style={[styles.sortOptionText, sorting === opt.key && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sorting === opt.key && <Check size={18} stroke={ShopColors.primary} strokeWidth={2} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Filter Modal ────────────────────── */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={22} stroke={Colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.filterTitle}>Filters</Text>
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterBody} showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceInputRow}>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <Text style={styles.priceValue}>
                    {localFilters.minPrice !== null ? `$${localFilters.minPrice}` : 'Any'}
                  </Text>
                </View>
                <Text style={styles.priceDash}>–</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <Text style={styles.priceValue}>
                    {localFilters.maxPrice !== null ? `$${localFilters.maxPrice}` : 'Any'}
                  </Text>
                </View>
              </View>
              {/* Quick price buttons */}
              <View style={styles.quickPriceRow}>
                {[25, 50, 100, 200, 500].map((price) => (
                  <TouchableOpacity
                    key={price}
                    style={[
                      styles.quickPriceBtn,
                      localFilters.maxPrice === price && styles.quickPriceBtnActive,
                    ]}
                    onPress={() => setLocalFilters((p) => ({
                      ...p,
                      maxPrice: p.maxPrice === price ? null : price,
                    }))}
                  >
                    <Text style={[
                      styles.quickPriceText,
                      localFilters.maxPrice === price && styles.quickPriceTextActive,
                    ]}>
                      Under ${price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Size */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Size</Text>
              <View style={styles.sizeRow}>
                {SIZE_OPTIONS.map((size) => {
                  const isActive = localFilters.sizes.includes(size);
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[styles.sizeChip, isActive && styles.sizeChipActive]}
                      onPress={() => toggleSize(size)}
                    >
                      <Text style={[styles.sizeChipText, isActive && styles.sizeChipTextActive]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Color */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((color) => {
                  const isActive = localFilters.colors.includes(color.name);
                  return (
                    <TouchableOpacity
                      key={color.name}
                      style={styles.colorItem}
                      onPress={() => toggleColor(color.name)}
                    >
                      <View style={[
                        styles.colorCircle,
                        { backgroundColor: color.code },
                        color.code === '#FFFFFF' && styles.colorCircleWhite,
                        isActive && { borderColor: ShopColors.primary, borderWidth: 3 },
                      ]}>
                        {isActive && <Check size={14} stroke={color.code === '#FFFFFF' ? ShopColors.primary : '#FFF'} strokeWidth={3} />}
                      </View>
                      <Text style={styles.colorName}>{color.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Toggles */}
            <View style={styles.filterSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>On Sale Only</Text>
                <Switch
                  value={localFilters.onSale}
                  onValueChange={(v) => setLocalFilters((p) => ({ ...p, onSale: v }))}
                  trackColor={{ false: Colors.borderDark, true: ShopColors.primaryLight }}
                  thumbColor={localFilters.onSale ? ShopColors.primary : Colors.text.tertiary}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>In Stock Only</Text>
                <Switch
                  value={localFilters.inStock}
                  onValueChange={(v) => setLocalFilters((p) => ({ ...p, inStock: v }))}
                  trackColor={{ false: Colors.borderDark, true: ShopColors.primaryLight }}
                  thumbColor={localFilters.inStock ? ShopColors.primary : Colors.text.tertiary}
                />
              </View>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.filterFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  resultCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Toolbar
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  toolBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  toolBtnValue: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  toolDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.sm,
  },
  filterBadge: {
    backgroundColor: ShopColors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Grid
  gridContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  productImageWrap: {
    width: '100%',
    height: PRODUCT_CARD_WIDTH * 1.1,
    backgroundColor: Colors.backgroundAlt,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  saleBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: ShopColors.badge,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  saleBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  wishlistBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: Spacing.md,
    paddingTop: Spacing.md,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reviewCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: ShopColors.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
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
  clearFiltersBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: ShopColors.primaryLight,
  },
  clearFiltersBtnText: {
    color: ShopColors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sortOptionActive: {
    backgroundColor: ShopColors.primaryLight,
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  sortOptionTextActive: {
    color: ShopColors.primary,
    fontWeight: '600',
  },

  // Filter Modal
  filterModal: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: (StatusBar.currentHeight || 0) + 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: ShopColors.primary,
  },
  filterBody: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  filterSection: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  // Price
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  priceInputWrap: {
    flex: 1,
    backgroundColor: Colors.backgroundAlt,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 2,
  },
  priceDash: {
    fontSize: 16,
    color: Colors.text.tertiary,
  },
  quickPriceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  quickPriceBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPriceBtnActive: {
    backgroundColor: ShopColors.primaryLight,
    borderColor: ShopColors.primary,
  },
  quickPriceText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  quickPriceTextActive: {
    color: ShopColors.primary,
    fontWeight: '600',
  },

  // Size
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sizeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sizeChipActive: {
    backgroundColor: ShopColors.primary,
    borderColor: ShopColors.primary,
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  sizeChipTextActive: {
    color: '#FFF',
  },

  // Color
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  colorItem: {
    alignItems: 'center',
    width: 50,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorCircleWhite: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  colorName: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.text.primary,
  },

  // Apply
  filterFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  applyBtn: {
    backgroundColor: ShopColors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProductListScreen;
