// ============================================
// Shopping Home Screen — Production UI
// ============================================

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchHomeData, clearError } from './shoppingHomeSlice';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';
import type { HomeBanner } from './shoppingHomeApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40;
const BANNER_HEIGHT = 172;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

// ── Theme ───────────────────────────────────

const T = {
  bg: '#F8F9FD',
  surface: '#FFFFFF',
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#F0EDFF',
  accent: '#A29BFE',
  text: '#1A1B2E',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E8EAF0',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  star: '#FBBF24',
  sale: '#EF4444',
};

// ── Category Gradient Map ───────────────────

const CATEGORY_GRADIENTS: Record<string, string[]> = {
  Women: ['#E040FB', '#AB47BC'],
  Men: ['#42A5F5', '#1E88E5'],
  Kids: ['#66BB6A', '#388E3C'],
  Accessories: ['#FFA726', '#F57C00'],
  Home: ['#26C6DA', '#00ACC1'],
  Beauty: ['#EC407A', '#C2185B'],
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Women: 'woman',
  Men: 'man',
  Kids: 'happy',
  Accessories: 'watch',
  Home: 'home',
  Beauty: 'sparkles',
};

// ── Skeleton Component ──────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animVal, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(animVal, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity: animVal.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
        },
        style,
      ]}
    />
  );
};

// ── Banner Skeleton ─────────────────────────

const BannerSkeleton: React.FC = () => (
  <View style={styles.bannerSlide}>
    <SkeletonBox width={BANNER_WIDTH} height={BANNER_HEIGHT} borderRadius={20} />
  </View>
);

// ── Brand Card Skeleton ─────────────────────

const BrandCardSkeleton: React.FC = () => (
  <View style={styles.brandCard}>
    <SkeletonBox width={56} height={56} borderRadius={16} />
    <SkeletonBox width={80} height={14} style={{ marginTop: 10 }} />
    <SkeletonBox width={100} height={10} style={{ marginTop: 6 }} />
    <View style={{ flexDirection: 'row', marginTop: 8, gap: 4 }}>
      <SkeletonBox width={48} height={20} borderRadius={10} />
      <SkeletonBox width={48} height={20} borderRadius={10} />
    </View>
  </View>
);

// ── Product Card Skeleton ───────────────────

const ProductCardSkeleton: React.FC = () => (
  <View style={styles.productCard}>
    <SkeletonBox width="100%" height={160} borderRadius={16} />
    <SkeletonBox width="80%" height={14} style={{ marginTop: 10 }} />
    <SkeletonBox width="50%" height={12} style={{ marginTop: 6 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <SkeletonBox width={70} height={16} />
      <SkeletonBox width={30} height={14} />
    </View>
  </View>
);

// ── Category Skeleton ───────────────────────

const CategorySkeleton: React.FC = () => (
  <View style={styles.categoryTile}>
    <SkeletonBox width="100%" height={100} borderRadius={16} />
  </View>
);

// ════════════════════════════════════════════
// ── Main Component
// ════════════════════════════════════════════

const ShoppingHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const {
    banners,
    featuredBrands,
    featuredProducts,
    categories,
    loading,
    error,
  } = useAppSelector((s) => s.shoppingHome);

  const [refreshing, setRefreshing] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bannerScrollRef = useRef<FlatList>(null);
  const bannerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cart badge (reads from cart slice) ──
  const cartItemCount = useAppSelector((s) => {
    // Safe access — cartSlice may not have items yet
    const cartState = s.cart as any;
    if (Array.isArray(cartState?.items)) return cartState.items.length;
    return 0;
  });

  // ── Initial Load ──────────────────────────

  useEffect(() => {
    dispatch(fetchHomeData());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [dispatch]);

  // ── Auto-scroll Banners ───────────────────

  useEffect(() => {
    if (banners.length <= 1) return;

    bannerInterval.current = setInterval(() => {
      setActiveBanner((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);

    return () => {
      if (bannerInterval.current) clearInterval(bannerInterval.current);
    };
  }, [banners.length]);

  // ── Handlers ──────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchHomeData(true));
    setRefreshing(false);
  }, [dispatch]);

  const handleBrandPress = (brand: BrandConfig) => {
    navigation.navigate(ShoppingRouteNames.BrandStore, { brandId: brand.brandId });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, {
      productId: product.productId,
      brandId: product.brandId,
    });
  };

  const handleCategoryPress = (cat: Category) => {
    navigation.navigate(ShoppingRouteNames.ProductList, {
      brandId: '',
      categoryId: cat.categoryId,
      categoryName: cat.name,
    });
  };

  const handleSearchPress = () => {
    navigation.navigate(ShoppingRouteNames.ShoppingSearch);
  };

  const handleCartPress = () => {
    navigation.navigate(ShoppingRouteNames.Cart);
  };

  const handleBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
    setActiveBanner(idx);
  };

  // ── Formatted Price ───────────────────────

  const formatPrice = (price: number) =>
    `Rs. ${price.toLocaleString('en-PK')}`;

  // ══════════════════════════════════════════
  // ── Render Sub-components
  // ══════════════════════════════════════════

  // ── Banner Carousel Item ──────────────────

  const renderBanner = useCallback(
    ({ item }: { item: HomeBanner }) => (
      <TouchableOpacity
        style={styles.bannerSlide}
        activeOpacity={0.9}
        onPress={() => {
          if (item.ctaParams?.brandId) {
            navigation.navigate(ShoppingRouteNames.ProductList, {
              brandId: item.ctaParams.brandId,
            });
          }
        }}
        accessibilityLabel={item.title}
      >
        <LinearGradient
          colors={item.gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextArea}>
              <Text style={styles.bannerTitle}>{item.title}</Text>
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>{item.ctaText}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.bannerDecor}>
              <Ionicons name="bag-handle" size={64} color="rgba(255,255,255,0.15)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    ),
    [navigation],
  );

  // ── Brand Card ────────────────────────────

  const renderBrandCard = useCallback(
    ({ item }: { item: BrandConfig }) => {
      const brandInitials = item.name.substring(0, 2).toUpperCase();
      return (
        <TouchableOpacity
          style={styles.brandCard}
          onPress={() => handleBrandPress(item)}
          activeOpacity={0.8}
          accessibilityLabel={`${item.name} store`}
        >
          {/* Logo Circle */}
          <LinearGradient
            colors={[item.primaryColor, item.secondaryColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandLogo}
          >
            <Text style={styles.brandLogoText}>{brandInitials}</Text>
          </LinearGradient>

          <Text style={styles.brandName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.brandTagline} numberOfLines={1}>
            {item.tagline}
          </Text>

          {/* Category pills */}
          <View style={styles.brandPills}>
            {item.policies.paymentMethods.slice(0, 2).map((pm) => (
              <View key={pm} style={styles.brandPill}>
                <Text style={styles.brandPillText}>
                  {pm === 'cod' ? 'COD' : pm === 'card' ? 'Card' : pm.charAt(0).toUpperCase() + pm.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      );
    },
    [],
  );

  // ── Product Card ──────────────────────────

  const renderProductCard = useCallback(
    ({ item }: { item: Product }) => {
      const hasSale = item.salePrice !== undefined && item.salePrice < item.basePrice;
      const discount = hasSale
        ? Math.round(((item.basePrice - item.salePrice!) / item.basePrice) * 100)
        : 0;

      return (
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => handleProductPress(item)}
          activeOpacity={0.85}
          accessibilityLabel={item.name}
        >
          {/* Image Placeholder */}
          <LinearGradient
            colors={['#F1F5F9', '#E2E8F0']}
            style={styles.productImage}
          >
            <Ionicons name="shirt-outline" size={40} color={T.textTertiary} />

            {/* Sale Badge */}
            {hasSale && (
              <View style={styles.saleBadge}>
                <Text style={styles.saleBadgeText}>{discount}% OFF</Text>
              </View>
            )}

            {/* New Arrival Badge */}
            {item.isNewArrival && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}

            {/* Wishlist Heart */}
            <TouchableOpacity
              style={styles.wishlistBtn}
              accessibilityLabel={`Add ${item.name} to wishlist`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="heart-outline" size={18} color={T.textSecondary} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>

            {/* Rating */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={T.star} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.totalReviews})</Text>
            </View>

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {formatPrice(hasSale ? item.salePrice! : item.basePrice)}
              </Text>
              {hasSale && (
                <Text style={styles.originalPrice}>
                  {formatPrice(item.basePrice)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [],
  );

  // ── Category Tile ─────────────────────────

  const renderCategoryTile = useCallback(
    ({ item }: { item: Category }) => {
      const gradient = CATEGORY_GRADIENTS[item.name] || ['#6C5CE7', '#A29BFE'];
      const icon = CATEGORY_ICONS[item.name] || 'pricetag';
      return (
        <TouchableOpacity
          style={styles.categoryTile}
          onPress={() => handleCategoryPress(item)}
          activeOpacity={0.85}
          accessibilityLabel={`Shop ${item.name}`}
        >
          <LinearGradient
            colors={gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryGradient}
          >
            <Ionicons name={icon} size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryCount}>{item.productCount} items</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [],
  );

  // ══════════════════════════════════════════
  // ── Error State
  // ══════════════════════════════════════════

  if (error && !loading && featuredBrands.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
        <View style={styles.errorWrap}>
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.errorIcon}
          >
            <Ionicons name="cloud-offline-outline" size={48} color={T.danger} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMsg}>
            We couldn't load the shopping feed.{'\n'}Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              dispatch(clearError());
              dispatch(fetchHomeData(true));
            }}
            activeOpacity={0.8}
            accessibilityLabel="Retry loading"
          >
            <LinearGradient
              colors={[T.primary, T.primaryDark]}
              style={styles.retryBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════
  // ── Main Render
  // ══════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} translucent={false} />

      {/* ── Fixed Header ─────────────────────── */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoWrap}>
              <LinearGradient
                colors={[T.primary, T.primaryDark]}
                style={styles.logoGrad}
              >
                <Ionicons name="bag-handle" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerBrand}>MetroShop</Text>
              <Text style={styles.headerSub}>Discover top brands</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Search */}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleSearchPress}
              accessibilityLabel="Search products"
            >
              <Ionicons name="search-outline" size={22} color={T.text} />
            </TouchableOpacity>

            {/* Cart */}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleCartPress}
              accessibilityLabel="View cart"
            >
              <Ionicons name="cart-outline" size={22} color={T.text} />
              {cartItemCount > 0 && (
                <Animated.View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Scrollable Content ───────────────── */}
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[T.primary]}
            tintColor={T.primary}
          />
        }
      >
        {/* ── Tappable Search Bar ────────────── */}
        <Animated.View style={[styles.searchBarWrap, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={handleSearchPress}
            activeOpacity={0.8}
            accessibilityLabel="Search products"
          >
            <Ionicons name="search-outline" size={18} color={T.textTertiary} />
            <Text style={styles.searchPlaceholder}>Search brands, products…</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ════ Banner Carousel ════════════════ */}
        <View style={styles.bannerSection}>
          {loading && banners.length === 0 ? (
            <BannerSkeleton />
          ) : (
            <>
              <FlatList
                ref={bannerScrollRef}
                data={banners}
                renderItem={renderBanner}
                keyExtractor={(item) => item.bannerId}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={BANNER_WIDTH + 12}
                decelerationRate="fast"
                contentContainerStyle={styles.bannerList}
                onMomentumScrollEnd={handleBannerScroll}
                getItemLayout={(_, idx) => ({
                  length: BANNER_WIDTH + 12,
                  offset: (BANNER_WIDTH + 12) * idx,
                  index: idx,
                })}
              />
              {/* Dot Pagination */}
              <View style={styles.dotsRow}>
                {banners.map((_: HomeBanner, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      activeBanner === i && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* ════ Featured Brands ═══════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Featured Brands</Text>
              <Text style={styles.sectionSub}>Shop your favourite stores</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAll}
              onPress={() => navigation.navigate(ShoppingRouteNames.ShoppingSearch)}
              accessibilityLabel="See all brands"
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={14} color={T.primary} />
            </TouchableOpacity>
          </View>

          {loading && featuredBrands.length === 0 ? (
            <FlatList
              data={[1, 2, 3, 4]}
              renderItem={() => <BrandCardSkeleton />}
              keyExtractor={(i) => `bs-${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandsList}
            />
          ) : (
            <FlatList
              data={featuredBrands}
              renderItem={renderBrandCard}
              keyExtractor={(item) => item.brandId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandsList}
            />
          )}
        </View>

        {/* ════ Shop by Category ══════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <Text style={styles.sectionSub}>Browse what you love</Text>
            </View>
          </View>

          {loading && categories.length === 0 ? (
            <View style={styles.categoryGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CategorySkeleton key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.categoryGrid}>
              {categories.map((cat: Category) => (
                <View key={cat.categoryId}>
                  {renderCategoryTile({ item: cat })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ════ Trending Products ═════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <Text style={styles.sectionSub}>Most popular picks</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAll}
              onPress={() =>
                navigation.navigate(ShoppingRouteNames.ProductList, {
                  brandId: '',
                  categoryName: 'Trending',
                })
              }
              accessibilityLabel="See all trending products"
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={14} color={T.primary} />
            </TouchableOpacity>
          </View>

          {loading && featuredProducts.length === 0 ? (
            <View style={styles.productGrid}>
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.productGrid}>
              {featuredProducts.map((product: Product) => (
                <View key={product.productId}>
                  {renderProductCard({ item: product })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Bottom Spacer ──────────────────── */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

// ══════════════════════════════════════════════
// ── Styles
// ══════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Container ────
  container: { flex: 1, backgroundColor: T.bg },

  // ── Header ───────
  headerSafe: { backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {},
  logoGrad: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -0.4,
  },
  headerSub: { fontSize: 12, color: T.textTertiary, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: T.danger,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  cartBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  // ── Scroll ───────
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Search Bar ───
  searchBarWrap: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  searchPlaceholder: { fontSize: 14, color: T.textTertiary, flex: 1 },

  // ── Banner Section ──
  bannerSection: { marginBottom: 24 },
  bannerList: { paddingHorizontal: 20 },
  bannerSlide: { width: BANNER_WIDTH, marginRight: 12 },
  bannerGradient: {
    width: '100%',
    height: BANNER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 22,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerTextArea: { flex: 1, justifyContent: 'center' },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: 12,
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  bannerCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bannerDecor: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },

  // ── Dots ─────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 22,
    backgroundColor: T.primary,
    borderRadius: 4,
  },

  // ── Section ──────
  section: { marginBottom: 28 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: T.textTertiary,
    marginTop: 2,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.primary,
  },

  // ── Brand Cards ──
  brandsList: { paddingHorizontal: 20 },
  brandCard: {
    width: 140,
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
    marginTop: 10,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 11,
    color: T.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  brandPills: { flexDirection: 'row', marginTop: 8, gap: 4 },
  brandPill: {
    backgroundColor: T.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  brandPillText: { fontSize: 9, fontWeight: '600', color: T.primary },

  // ── Category Grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryTile: {
    width: (SCREEN_WIDTH - 52) / 2,
  },
  categoryGradient: {
    height: 100,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'flex-end',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  categoryCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // ── Product Grid ──
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: T.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  productImage: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: T.sale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saleBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  newBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: T.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  wishlistBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { padding: 12 },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
    lineHeight: 18,
    minHeight: 36,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: '700', color: T.text },
  reviewCount: { fontSize: 11, color: T.textTertiary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: T.text,
  },
  originalPrice: {
    fontSize: 12,
    color: T.textTertiary,
    textDecorationLine: 'line-through',
  },

  // ── Error State ──
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.text,
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: T.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  retryBtn: { borderRadius: 14, overflow: 'hidden' },
  retryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default ShoppingHomeScreen;
