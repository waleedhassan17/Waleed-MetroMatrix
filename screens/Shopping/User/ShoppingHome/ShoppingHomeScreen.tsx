import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, ShoppingCart, Star, Heart, Wallet } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { BrandConfig, Product } from '../../../../types/shopping';
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
import { selectCartItemCount } from '../Cart/cartSlice';
import { selectBalance, selectCurrency } from '../../../../services/wallet';
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const BANNER_HEIGHT = 180;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

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
      style={styles.bannerCard}
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



  const renderProductCard = ({ item, index }: { item: Product; index: number }) => {
    const hasDiscount = Boolean(item.salePrice && item.salePrice < item.basePrice);
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

  const renderCategoryCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(ShoppingRouteNames.ProductList as never, { categoryId: item.id } as never)}
    >
      <View style={styles.categoryIconWrap}>
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
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

  // ── Categories ────────────────────────────
  const categories = [
    { id: '1', name: 'Fashion', icon: '👕' },
    { id: '2', name: 'Electronics', icon: '📱' },
    { id: '3', name: 'Home', icon: '🏠' },
    { id: '4', name: 'Beauty', icon: '💄' },
    { id: '5', name: 'Sports', icon: '⚽' },
    { id: '6', name: 'Books', icon: '📚' },
    { id: '7', name: 'Toys', icon: '🧸' },
    { id: '8', name: 'More', icon: '📦' },
  ];

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

        {/* ── Categories ──────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.sectionSubtitle}>Shop by department</Text>
            </View>
          </View>
          <FlatList
            data={categories}
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
              {featuredProducts.slice(0, 6).map((product, index) => (
                <View key={product.productId} style={{ width: PRODUCT_CARD_WIDTH }}>
                  {renderProductCard({ item: product, index })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── New Arrivals ────────────────────── */}
        {featuredProducts.filter(p => p.isNewArrival).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>🆕 New Arrivals</Text>
                <Text style={styles.sectionSubtitle}>Just dropped this week</Text>
              </View>
            </View>
            <FlatList
              data={featuredProducts.filter(p => p.isNewArrival).slice(0, 8)}
              renderItem={({ item, index }) => (
                <View style={{ width: PRODUCT_CARD_WIDTH, marginRight: index % 2 === 0 ? Spacing.md : 0 }}>
                  {renderProductCard({ item, index })}
                </View>
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
    width: BANNER_WIDTH,
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
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },



  // Product Cards
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
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
    padding: Spacing.sm,
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
});

export default ShoppingHomeScreen;
