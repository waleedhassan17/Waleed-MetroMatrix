// ============================================
// Brand Store Screen — Dynamic Theming
// ============================================

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useBrandTheme } from '../../../../hooks/useBrandTheme';
import {
  fetchBrandStore,
  fetchFilteredProducts,
  loadMoreProducts,
  setSelectedBrand,
  clearSelectedBrand,
  setSelectedCategory,
  setSortBy,
  clearError,
  resetBrandStore,
} from './brandStoreSlice';
import type { BrandStoreSortOption } from './brandStoreSlice';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { Product, Category, BrandConfig } from '../../../../models/shopping/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 220;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

// ── Sort Options ────────────────────────────

const SORT_OPTIONS: { key: BrandStoreSortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'relevance', label: 'Relevance', icon: 'sparkles-outline' },
  { key: 'price_low', label: 'Price: Low → High', icon: 'arrow-up-outline' },
  { key: 'price_high', label: 'Price: High → Low', icon: 'arrow-down-outline' },
  { key: 'rating', label: 'Top Rated', icon: 'star-outline' },
  { key: 'newest', label: 'Newest First', icon: 'time-outline' },
];

// ── Skeleton ────────────────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#E5E7EB', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }) }, style]}
    />
  );
};

const ProductCardSkeleton: React.FC = () => (
  <View style={styles.productCard}>
    <SkeletonBox width="100%" height={150} borderRadius={14} />
    <SkeletonBox width="80%" height={13} style={{ marginTop: 10 }} />
    <SkeletonBox width="50%" height={11} style={{ marginTop: 6 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <SkeletonBox width={70} height={15} />
      <SkeletonBox width={30} height={13} />
    </View>
  </View>
);

// ════════════════════════════════════════════
// ── Main Component
// ════════════════════════════════════════════

const BrandStoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { primaryColor, secondaryColor, accentColor, textOnPrimary, isDark } = useBrandTheme();

  const brandId: string = route.params?.brandId ?? 'brand-1';

  const {
    brand,
    products,
    categories,
    selectedCategoryId,
    sortBy,
    loading,
    loadingProducts,
    loadingMore,
    error,
    hasMore,
    totalProducts,
  } = useAppSelector((s) => s.brandStore);

  const [refreshing, setRefreshing] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Mount / Unmount ───────────────────────

  useEffect(() => {
    dispatch(fetchBrandStore(brandId));
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    return () => {
      dispatch(clearSelectedBrand());
      dispatch(resetBrandStore());
    };
  }, [dispatch, brandId]);

  // Set selected brand for useBrandTheme once loaded
  useEffect(() => {
    if (brand) {
      dispatch(setSelectedBrand(brand));
    }
  }, [brand, dispatch]);

  // ── Handlers ──────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchBrandStore(brandId));
    setRefreshing(false);
  }, [dispatch, brandId]);

  const handleCategoryPress = useCallback(
    (catId: string | null) => {
      dispatch(setSelectedCategory(catId));
      dispatch(fetchFilteredProducts());
    },
    [dispatch],
  );

  const handleSortSelect = useCallback(
    (opt: BrandStoreSortOption) => {
      dispatch(setSortBy(opt));
      dispatch(fetchFilteredProducts());
      setShowSort(false);
    },
    [dispatch],
  );

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate(ShoppingRouteNames.ProductDetail, {
        productId: product.productId,
        brandId: product.brandId,
      });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore) dispatch(loadMoreProducts());
  }, [dispatch, loadingMore, hasMore]);

  const formatPrice = (p: number) => `Rs. ${p.toLocaleString('en-PK')}`;

  // ── Parallax Banner ───────────────────────

  const bannerTranslate = scrollY.interpolate({
    inputRange: [-BANNER_HEIGHT, 0, BANNER_HEIGHT],
    outputRange: [-BANNER_HEIGHT / 2, 0, BANNER_HEIGHT * 0.3],
    extrapolate: 'clamp',
  });

  const bannerScale = scrollY.interpolate({
    inputRange: [-BANNER_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolateRight: 'clamp',
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, BANNER_HEIGHT - 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ── Product Card ──────────────────────────

  const renderProductCard = useCallback(
    ({ item }: { item: Product }) => {
      const hasSale = item.salePrice !== undefined && item.salePrice < item.basePrice;
      const discount = hasSale ? Math.round(((item.basePrice - item.salePrice!) / item.basePrice) * 100) : 0;

      return (
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => handleProductPress(item)}
          activeOpacity={0.85}
          accessibilityLabel={item.name}
        >
          <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={styles.productImage}>
            <Ionicons name="shirt-outline" size={36} color="#94A3B8" />
            {hasSale && (
              <View style={[styles.saleBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.saleBadgeText}>{discount}% OFF</Text>
              </View>
            )}
            {item.isNewArrival && (
              <View style={[styles.newBadge, { backgroundColor: accentColor }]}>
                <Text style={[styles.newBadgeText, { color: textOnPrimary }]}>NEW</Text>
              </View>
            )}
            <TouchableOpacity style={styles.wishlistBtn} accessibilityLabel={`Add ${item.name} to wishlist`}>
              <Ionicons name="heart-outline" size={16} color="#64748B" />
            </TouchableOpacity>
          </LinearGradient>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#FBBF24" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.totalReviews})</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(hasSale ? item.salePrice! : item.basePrice)}</Text>
              {hasSale && <Text style={styles.originalPrice}>{formatPrice(item.basePrice)}</Text>}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.addToCartBtn, { backgroundColor: accentColor }]}
            accessibilityLabel={`Add ${item.name} to cart`}
          >
            <Ionicons name="cart-outline" size={14} color={textOnPrimary} />
            <Text style={[styles.addToCartText, { color: textOnPrimary }]}>Add</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handleProductPress, primaryColor, accentColor, textOnPrimary],
  );

  // ── Footer ────────────────────────────────

  const renderFooter = useCallback(() => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={primaryColor} />
        <Text style={styles.footerText}>Loading more…</Text>
      </View>
    );
  }, [loadingMore, primaryColor]);

  // ── Error State ───────────────────────────

  if (error && !loading && !brand) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorWrap}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIcon}>
            <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Store Unavailable</Text>
          <Text style={styles.errorMsg}>We couldn't load this brand store. Please try again.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { dispatch(clearError()); dispatch(fetchBrandStore(brandId)); }}
            accessibilityLabel="Retry"
          >
            <LinearGradient colors={['#6C5CE7', '#5A4BD1']} style={styles.retryBtnGrad}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading State ─────────────────────────

  if (loading && !brand) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <SkeletonBox width="100%" height={BANNER_HEIGHT} borderRadius={0} />
        <View style={{ padding: 20 }}>
          <SkeletonBox width={160} height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width={220} height={14} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonBox key={i} width={80} height={34} borderRadius={17} />)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
          </View>
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════
  // ── Main Render
  // ════════════════════════════════════════════

  const brandInitials = brand?.name?.substring(0, 2).toUpperCase() || '??';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* ── Floating Header ──────────────────── */}
      <Animated.View style={[styles.floatingHeader, { paddingTop: insets.top, opacity: headerBgOpacity }]}>
        <LinearGradient
          colors={[primaryColor, secondaryColor]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Animated.Text style={[styles.headerTitle, { opacity: headerBgOpacity, color: textOnPrimary }]} numberOfLines={1}>
          {brand?.name}
        </Animated.Text>
        <View style={styles.headerRightBtns}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate(ShoppingRouteNames.ShoppingSearch, { brandId })}
            accessibilityLabel="Search in this store"
          >
            <Ionicons name="search-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowInfo(true)}
            accessibilityLabel="Brand info"
          >
            <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ──────────────────────────── */}
      <Animated.ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[primaryColor]} tintColor={primaryColor} />
        }
      >
        {/* ── Parallax Banner ────────────────── */}
        <Animated.View style={[styles.bannerWrap, { transform: [{ translateY: bannerTranslate }, { scale: bannerScale }] }]}>
          <LinearGradient
            colors={[primaryColor, secondaryColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerDecoTop}>
              <View style={[styles.bannerCircle, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
              <View style={[styles.bannerCircle2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Brand Info Area ────────────────── */}
        <View style={styles.brandArea}>
          {/* Logo overlaid */}
          <View style={styles.logoOverlay}>
            <LinearGradient
              colors={[primaryColor, secondaryColor]}
              style={styles.logoCircle}
            >
              <Text style={styles.logoInitials}>{brandInitials}</Text>
            </LinearGradient>
          </View>
          <View style={styles.brandMeta}>
            <Text style={styles.brandName}>{brand?.name}</Text>
            <Text style={styles.brandTagline}>{brand?.tagline}</Text>
            <View style={styles.brandStatsRow}>
              <View style={styles.brandStat}>
                <Text style={styles.brandStatValue}>{totalProducts}</Text>
                <Text style={styles.brandStatLabel}>Products</Text>
              </View>
              <View style={[styles.brandStatDivider, { backgroundColor: accentColor + '40' }]} />
              <View style={styles.brandStat}>
                <Text style={styles.brandStatValue}>{brand?.policies.returnDays}d</Text>
                <Text style={styles.brandStatLabel}>Returns</Text>
              </View>
              <View style={[styles.brandStatDivider, { backgroundColor: accentColor + '40' }]} />
              <View style={styles.brandStat}>
                <Text style={styles.brandStatValue}>{brand?.policies.paymentMethods.length}</Text>
                <Text style={styles.brandStatLabel}>Pay Methods</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Category Tabs ──────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          style={styles.catScroll}
        >
          <TouchableOpacity
            style={[styles.catChip, !selectedCategoryId && [styles.catChipActive, { backgroundColor: accentColor }]]}
            onPress={() => handleCategoryPress(null)}
            accessibilityLabel="All categories"
          >
            <Text style={[styles.catChipText, !selectedCategoryId && { color: textOnPrimary, fontWeight: '700' }]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat: Category) => {
            const isActive = selectedCategoryId === cat.categoryId;
            return (
              <TouchableOpacity
                key={cat.categoryId}
                style={[styles.catChip, isActive && [styles.catChipActive, { backgroundColor: accentColor }]]}
                onPress={() => handleCategoryPress(cat.categoryId)}
                accessibilityLabel={cat.name}
              >
                <Text style={[styles.catChipText, isActive && { color: textOnPrimary, fontWeight: '700' }]}>
                  {cat.name}
                </Text>
                <Text style={[styles.catChipCount, isActive && { color: textOnPrimary + 'CC' }]}>
                  {cat.productCount}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Products Header ────────────────── */}
        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>
            {selectedCategoryId
              ? categories.find((c: Category) => c.categoryId === selectedCategoryId)?.name || 'Products'
              : 'All Products'}
          </Text>
          <TouchableOpacity style={styles.sortToggle} onPress={() => setShowSort(true)} accessibilityLabel="Sort products">
            <Ionicons name="swap-vertical-outline" size={16} color={primaryColor} />
            <Text style={[styles.sortToggleText, { color: primaryColor }]}>
              {SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Sort'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Product Grid ───────────────────── */}
        {loadingProducts ? (
          <View style={styles.productGrid}>
            {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyProducts}>
            <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyMsg}>Try a different category or clear filters.</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.map((product: Product) => (
              <View key={product.productId}>
                {renderProductCard({ item: product })}
              </View>
            ))}
          </View>
        )}

        {/* Load more button */}
        {hasMore && products.length > 0 && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: primaryColor }]}
            onPress={handleEndReached}
            disabled={loadingMore}
            accessibilityLabel="Load more products"
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Text style={[styles.loadMoreText, { color: primaryColor }]}>Load More</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* ── Floating Sort+Filter FAB ─────────── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => setShowSort(true)}
        accessibilityLabel="Sort and filter"
      >
        <Ionicons name="options-outline" size={22} color={textOnPrimary} />
      </TouchableOpacity>

      {/* ── Sort Sheet ───────────────────────── */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSort(false)}>
          <View style={styles.sortSheet}>
            <View style={styles.sortHandle} />
            <Text style={styles.sortTitle}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortItem, isActive && { backgroundColor: primaryColor + '10' }]}
                  onPress={() => handleSortSelect(opt.key)}
                  accessibilityLabel={`Sort by ${opt.label}`}
                >
                  <Ionicons name={opt.icon} size={20} color={isActive ? primaryColor : '#64748B'} />
                  <Text style={[styles.sortItemText, isActive && { color: primaryColor, fontWeight: '700' }]}>{opt.label}</Text>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={primaryColor} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Brand Info Sheet ──────────────────── */}
      <Modal visible={showInfo} transparent animationType="slide" onRequestClose={() => setShowInfo(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInfo(false)}>
          <View style={styles.infoSheet}>
            <View style={styles.sortHandle} />
            <View style={styles.infoHeader}>
              <LinearGradient colors={[primaryColor, secondaryColor]} style={styles.infoLogo}>
                <Text style={styles.infoLogoText}>{brandInitials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoName}>{brand?.name}</Text>
                <Text style={styles.infoTagline}>{brand?.tagline}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <InfoRow icon="return-down-back-outline" label="Return Policy" value={`${brand?.policies.returnDays} days returns`} color={primaryColor} />
            <InfoRow icon="car-outline" label="Shipping" value={brand?.policies.shippingInfo || 'Standard shipping'} color={primaryColor} />
            <InfoRow icon="card-outline" label="Payment" value={brand?.policies.paymentMethods.join(', ').toUpperCase() || '—'} color={primaryColor} />
            <InfoRow icon="mail-outline" label="Email" value={brand?.contactEmail || '—'} color={primaryColor} />
            <InfoRow icon="call-outline" label="Phone" value={brand?.contactPhone || '—'} color={primaryColor} />
            {brand?.website && <InfoRow icon="globe-outline" label="Website" value={brand.website} color={primaryColor} />}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Info Row sub-component ──────────────────

const InfoRow: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIconWrap, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// ══════════════════════════════════════════════
// ── Styles
// ══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },

  // Header
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    height: 100, overflow: 'hidden',
  },
  headerRow: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  headerRightBtns: { flexDirection: 'row', gap: 6 },

  // Banner
  bannerWrap: { height: BANNER_HEIGHT, overflow: 'hidden' },
  banner: { flex: 1, justifyContent: 'flex-end' },
  bannerDecoTop: { ...StyleSheet.absoluteFillObject },
  bannerCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -40, right: -30 },
  bannerCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: 10, left: -20 },

  // Brand Area
  brandArea: { backgroundColor: '#FFFFFF', paddingTop: 36, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E8EAF0' },
  logoOverlay: { position: 'absolute', top: -32, left: 20 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  logoInitials: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  brandMeta: { marginLeft: 76 },
  brandName: { fontSize: 22, fontWeight: '800', color: '#1A1B2E', letterSpacing: -0.3 },
  brandTagline: { fontSize: 13, color: '#64748B', marginTop: 2 },
  brandStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 0 },
  brandStat: { alignItems: 'center', flex: 1 },
  brandStatValue: { fontSize: 16, fontWeight: '800', color: '#1A1B2E' },
  brandStatLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  brandStatDivider: { width: 1, height: 28, marginHorizontal: 8 },

  // Category Tabs
  catScroll: { maxHeight: 52, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8EAF0' },
  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E8EAF0',
  },
  catChipActive: { borderWidth: 0, borderColor: 'transparent' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catChipCount: { fontSize: 11, color: '#94A3B8' },

  // Products Header
  productsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  productsTitle: { fontSize: 18, fontWeight: '800', color: '#1A1B2E' },
  sortToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortToggleText: { fontSize: 13, fontWeight: '600' },

  // Product Grid
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  productCard: {
    width: PRODUCT_CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E8EAF0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 3 } }),
    marginBottom: 4,
  },
  productImage: { width: '100%', height: 150, justifyContent: 'center', alignItems: 'center' },
  saleBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  saleBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  newBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  newBadgeText: { fontSize: 9, fontWeight: '800' },
  wishlistBtn: {
    position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center',
  },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '600', color: '#1A1B2E', lineHeight: 16, minHeight: 32 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#1A1B2E' },
  reviewCount: { fontSize: 10, color: '#94A3B8' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  price: { fontSize: 14, fontWeight: '800', color: '#1A1B2E' },
  originalPrice: { fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' },
  addToCartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginHorizontal: 10, marginBottom: 10, paddingVertical: 8, borderRadius: 10,
  },
  addToCartText: { fontSize: 12, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }, android: { elevation: 8 } }),
  },

  // Load more
  loadMoreBtn: {
    alignSelf: 'center', marginTop: 16, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5,
  },
  loadMoreText: { fontSize: 14, fontWeight: '700' },

  // Footer
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  footerText: { fontSize: 13, color: '#94A3B8' },

  // Empty
  emptyProducts: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1B2E', marginTop: 12 },
  emptyMsg: { fontSize: 13, color: '#64748B', marginTop: 4 },

  // Error
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorIcon: { width: 96, height: 96, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1A1B2E', marginBottom: 8 },
  errorMsg: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn: { borderRadius: 14, overflow: 'hidden' },
  retryBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, gap: 8, borderRadius: 14 },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 12,
  },
  sortHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E8EAF0', alignSelf: 'center', marginBottom: 16 },
  sortTitle: { fontSize: 18, fontWeight: '800', color: '#1A1B2E', marginBottom: 16 },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    gap: 12, borderRadius: 12, marginBottom: 2,
  },
  sortItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#64748B' },

  // Info Sheet
  infoSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 12,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  infoLogo: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  infoLogoText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  infoName: { fontSize: 18, fontWeight: '700', color: '#1A1B2E' },
  infoTagline: { fontSize: 13, color: '#64748B', marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: '#E8EAF0', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1B2E', marginTop: 2 },
});

export default BrandStoreScreen;
