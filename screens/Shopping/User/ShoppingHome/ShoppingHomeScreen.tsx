import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, ShoppingCart, Wallet, Mars, Venus, Baby, LucideIcon } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { Product } from '../../../../types/shopping';
import {
  fetchHomeData,
  refreshHomeData,
  selectFeaturedBrands,
  selectFeaturedProducts,
  selectBanners,
  selectShoppingHomeLoading,
  selectShoppingHome,
} from './shoppingHomeSlice';
import { ShoppingHeader } from '../../../../components/shopping/ShoppingHeader';
import MiniWalletCard from '../../../../components/MiniWalletCard/MiniWalletCard';
import { selectCartItemCount } from '../Cart/cartSlice';
import { selectBalance, selectCurrency } from '../../../../services/wallet';
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';
import ProductCard, { ProductCardSkeleton } from '../../../../components/Shopping/ProductCard';
import { useProductGridSizing } from '../../../../hooks/useProductGridSizing';

// Only sections that actually exist in the seeded catalogue (both brands tag
// products with their gender section — see brands.seed.js — Kids exists on
// Cougar only, so it stays in the list even though Outfitters has none).
interface CategoryDef {
  id: string;
  name: string;
  Icon: LucideIcon;
}
const CATEGORIES: CategoryDef[] = [
  { id: 'men', name: 'Men', Icon: Mars },
  { id: 'women', name: 'Women', Icon: Venus },
  { id: 'kids', name: 'Kids', Icon: Baby },
];

const BANNER_HEIGHT = 180;

// ── Shopping Colors ─────────────────────────
const ShopColors = {
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF8F0',
  accent: '#F39C12',
  badge: '#E74C3C',
  gradientStart: '#F97316',
  gradientEnd: '#EA580C',
  success: '#10B981',
  surfaceElevated: '#FFFFFF',
};

const ShoppingHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const featuredBrands = useAppSelector(selectFeaturedBrands);
  const featuredProducts = useAppSelector(selectFeaturedProducts);
  const banners = useAppSelector(selectBanners);
  const loading = useAppSelector(selectShoppingHomeLoading);
  const { refreshing, error } = useAppSelector(selectShoppingHome);

  const wishlistItems = useAppSelector(selectWishlistItems);
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.productId)), [wishlistItems]);

  const { width: screenWidth } = useWindowDimensions();
  const BANNER_WIDTH = screenWidth - Spacing.lg * 2;
  const { cardWidth, imageHeight } = useProductGridSizing();

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const cartItemCount = useAppSelector(selectCartItemCount);
  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;

  useEffect(() => {
    dispatch(fetchHomeData());
  }, [dispatch]);

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleRefresh = useCallback(() => {
    dispatch(refreshHomeData());
  }, [dispatch]);

  const navigateToBrandStore = (brandId: string) => {
    navigation.navigate(ShoppingRouteNames.BrandStore, { brandId });
  };

  const navigateToProductDetail = (productId: string, brandId: string) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, { productId, brandId });
  };

  const navigateToSearch = () => {
    navigation.navigate(ShoppingRouteNames.SearchProducts);
  };

  const navigateToCart = () => {
    navigation.navigate(ShoppingRouteNames.Cart);
  };

  const navigateToBrandList = () => {
    navigation.navigate(ShoppingRouteNames.BrandList);
  };

  // ── Render Helpers ────────────────────────

  const renderBanner = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.bannerCard, { width: BANNER_WIDTH }]}
      activeOpacity={0.9}
      onPress={() => {
        if (item.brandId) navigateToBrandStore(item.brandId);
      }}
    >
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <View style={styles.bannerOverlay}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        {!!item.subtitle && <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );



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

  const toProductCardData = (item: Product) => ({
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
  });

  const renderCategoryCard = ({ item }: { item: CategoryDef }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(ShoppingRouteNames.ProductList as never, { gender: item.id } as never)}
    >
      <View style={styles.categoryIconWrap}>
        <item.Icon size={26} stroke={ShopColors.primary} strokeWidth={1.75} />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  // ── Dummy banners if none from API ────────
  const displayBanners = banners.length > 0 ? banners : [
    { id: '1', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'New Arrivals', subtitle: 'Discover the latest trends' },
    { id: '2', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', title: 'Flash Sale', subtitle: 'Up to 50% off' },
    { id: '3', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', title: 'Top Brands', subtitle: 'Shop from the best' },
  ];

  // Trending Now is bounded to 6 items and rendered as explicit two-item
  // rows (not flexWrap, not a nested vertical FlatList inside this
  // ScrollView — either would fight the outer scroll/virtualisation).
  const trendingRows = useMemo(() => {
    const items = featuredProducts.slice(0, 6);
    const rows: Product[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return rows;
  }, [featuredProducts]);

  const newArrivals = useMemo(
    () => featuredProducts.filter((p) => p.isNewArrival).slice(0, 8),
    [featuredProducts]
  );

  if (loading && featuredBrands.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBrandedWrap}>
          <View style={styles.shimmerLogo}>
            <Text style={styles.shimmerLogoText}>🛍️</Text>
          </View>
          <ActivityIndicator size="large" color={ShopColors.primary} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Setting up your shop...</Text>
          <Text style={styles.loadingSubtext}>Discovering brands & products</Text>
        </View>
      </View>
    );
  }

  if (error && featuredBrands.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Couldn't load shop</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={() => dispatch(fetchHomeData(true))}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ── Header ──────────────────────────── */}
      <ShoppingHeader
        title="Shop"
        subtitle="Discover amazing brands"
        rightContent={
          <>
            <TouchableOpacity
              style={styles.walletChip}
              onPress={() => navigation.navigate('WalletScreen' as never)}
              activeOpacity={0.75}
            >
              <Wallet size={13} stroke={ShopColors.primary} strokeWidth={2} />
              <Text style={styles.walletChipText}>
                {walletCurrency.toLowerCase() === 'pkr' ? '₨' : '$'}{walletBalance.toFixed(0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={navigateToCart}>
              <ShoppingCart size={22} stroke={Colors.text.primary} strokeWidth={1.75} />
              {cartItemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        }
        showSearch={true}
        searchPlaceholder="Search products, brands..."
        onSearchPress={navigateToSearch}
      />





      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ShopColors.primary}
            colors={[ShopColors.primary]}
          />
        }
      >
        {/* ── Banners Carousel ────────────────── */}
        <View style={styles.bannerSection}>
          <FlatList
            ref={bannerRef}
            data={displayBanners}
            renderItem={renderBanner}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH + Spacing.md}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + Spacing.md));
              setBannerIndex(idx);
            }}
          />
          {displayBanners.length > 1 && (
            <View style={styles.dotsRow}>
              {displayBanners.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === bannerIndex ? styles.dotActive : {}]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Wallet — one component, one data source, everywhere (W2 Part 4).
            The header chip above reads the SAME selectBalance/selectCurrency,
            so the two never disagree. */}
        <MiniWalletCard onPress={() => navigation.navigate('WalletScreen' as never)} />

        {/* ── Categories ──────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.sectionSubtitle}>Shop by department</Text>
            </View>
          </View>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.lg }} />}
          />
        </View>

        {/* ── Trending Products ──────────────── */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <Text style={styles.sectionSubtitle}>Popular picks for you</Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate(ShoppingRouteNames.ProductList as never)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productGrid}>
              {trendingRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.productRow}>
                  {row.map((product) => (
                    <ProductCard
                      key={product.productId}
                      product={toProductCardData(product)}
                      width={cardWidth}
                      imageHeight={imageHeight}
                      onPress={navigateToProductDetail}
                      onWishlist={() => handleToggleWishlist(product)}
                      isWishlisted={wishlistIds.has(product.productId)}
                    />
                  ))}
                  {row.length === 1 && <View style={{ width: cardWidth }} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── New Arrivals ────────────────────── */}
        {newArrivals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>🆕 New Arrivals</Text>
                <Text style={styles.sectionSubtitle}>Just dropped this week</Text>
              </View>
            </View>
            <FlatList
              data={newArrivals}
              renderItem={({ item }) => (
                <ProductCard
                  product={toProductCardData(item)}
                  width={cardWidth}
                  imageHeight={imageHeight}
                  onPress={navigateToProductDetail}
                  onWishlist={() => handleToggleWishlist(item)}
                  isWishlisted={wishlistIds.has(item.productId)}
                />
              )}
              keyExtractor={(item) => `new-${item.productId}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
              ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
            />
          </View>
        )}

        {/* ── Bottom spacer ───────────────────── */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    backgroundColor: Colors.background,
  },
  loadingBrandedWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  shimmerLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: ShopColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerLogoText: {
    fontSize: 36,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.text.tertiary,
  },

  // Error State
  errorWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: ShopColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  headerLeft: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ShopColors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(230,126,34,0.2)',
  },
  walletChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: ShopColors.primary,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: ShopColors.badge,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },


  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },

  // Banners
  bannerSection: {
    marginTop: Spacing.sm,
  },
  bannerCard: {
    height: BANNER_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderDark,
  },
  dotActive: {
    width: 20,
    backgroundColor: ShopColors.primary,
    borderRadius: 3,
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  seeAllBtn: {
    backgroundColor: ShopColors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(230,126,34,0.15)',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: ShopColors.primary,
  },

  // Categories
  categoryCard: {
    alignItems: 'center',
    width: 72,
  },
  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: ShopColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    ...Shadows.small,
    marginBottom: Spacing.xs,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Product Cards — explicit two-up rows (no flexWrap on the outer
  // ScrollView, no nested vertical FlatList fighting it for scroll).
  productGrid: {
    paddingHorizontal: Spacing.lg,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
});

export default ShoppingHomeScreen;
