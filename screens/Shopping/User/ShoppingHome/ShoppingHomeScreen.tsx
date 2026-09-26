import React, { useEffect, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart, Wallet } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Spacing, BorderRadius, Shadows, makeColors, type ColorType } from '../../../../constants/Colors';
import { ThemeColors, useTheme } from '../../../../theme';
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
import type { Banner } from './shoppingHomeSlice';
import { ShoppingHeader } from '../../../../components/Shopping/ShoppingHeader';
import MiniWalletCard from '../../../../components/MiniWalletCard/MiniWalletCard';
import { selectCartItemCount } from '../Cart/cartSlice';
import { selectBalance, selectCurrency } from '../../../../services/wallet';
import { currencySymbol } from '../../../../constants/Currency';
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';
import { selectActiveBrand, clearActiveBrand } from '../BrandList/brandListSlice';
import ProductCard from '../../../../components/Shopping/ProductCard';
import BannerCarousel from '../../../../components/Shopping/BannerCarousel';
import { useProductGridSizing } from '../../../../hooks/useProductGridSizing';

// Department tiles are derived from live data, not a hardcoded list: the names
// come from the brands' own `categories`, and the artwork is a real product
// photo carrying that gender tag. They used to be three fixed rows of Unsplash
// stock, which meant a new department was invisible until someone shipped a
// build. Represented with product photography rather than glyph icons — a
// gendered symbol (Mars/Venus/Baby) reads as clinical next to product photos.
interface CategoryDef {
  id: string;
  name: string;
  image?: string;
}

const BANNER_HEIGHT = 180;

// ── Shopping Colors ─────────────────────────
// A function of the ramp, not a frozen table: every ground below is a
// light surface, and a frozen one is a white card on a dark page.
const makeShopColors = (c: ThemeColors) => ({
  primary: c.accent,
  primaryDark: c.accentDeep,
  primaryLight: c.accentSoft,
  accent: c.star,
  badge: c.error,
  gradientStart: c.accent,
  gradientEnd: c.accentDeep,
  success: c.success,
  surfaceElevated: c.surface,
});

const ShoppingHomeScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const ShopColors = useMemo(() => makeShopColors(colors), [colors]);
  const styles = useMemo(() => makeStyles(Colors, ShopColors), [Colors, ShopColors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const featuredBrands = useAppSelector(selectFeaturedBrands);
  const featuredProducts = useAppSelector(selectFeaturedProducts);
  const banners = useAppSelector(selectBanners);
  const loading = useAppSelector(selectShoppingHomeLoading);
  const { refreshing, error } = useAppSelector(selectShoppingHome);

  const wishlistItems = useAppSelector(selectWishlistItems);
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.productId)), [wishlistItems]);

  // Reached by drilling into a brand from the brand list, so this screen is
  // that brand's storefront — it should say so rather than the generic "Shop".
  const activeBrand = useAppSelector(selectActiveBrand);

  const { width: screenWidth } = useWindowDimensions();
  const BANNER_WIDTH = screenWidth - Spacing.lg * 2;
  const { cardWidth, imageHeight } = useProductGridSizing();

  const cartItemCount = useAppSelector(selectCartItemCount);
  const walletBalance = useAppSelector(selectBalance) as number;
  const walletCurrency = useAppSelector(selectCurrency) as string;

  // Keyed on the storefront, not just on mount. Entering a second brand
  // navigates back to an already-mounted ShoppingTabs with new params rather
  // than remounting it, so a mount-only fetch left the previous brand's
  // products on screen.
  useEffect(() => {
    dispatch(fetchHomeData());
  }, [dispatch, activeBrand?.brandId]);

  /**
   * Inside a storefront this screen IS that brand's shop, so the promo strip
   * has to be that brand's too. `GET /banners` is account-wide and takes no
   * brandId, so the shopper browsing Outfitters was shown Cougar artwork — and
   * tapping it walked them straight out into Cougar's store. Scoped here the
   * same way `categories` and the featured products already are.
   */
  const visibleBanners = useMemo(
    () => (activeBrand ? banners.filter((b) => b.brandId === activeBrand.brandId) : banners),
    [banners, activeBrand]
  );

  const handleRefresh = useCallback(() => {
    dispatch(refreshHomeData());
  }, [dispatch]);

  const navigateToBrandStore = (brandId: string) => {
    navigation.navigate(ShoppingRouteNames.BrandStore, { brandId });
  };

  const navigateToProductDetail = (productId: string, brandId: string) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, { productId, brandId });
  };

  /**
   * A banner may deep-link to a brand or to a single product. The server
   * validates the target on write and drops banners whose brand is no longer
   * live, so anything that arrives here is real.
   *
   * The brand jump only applies on the brand chooser. Inside a storefront the
   * banner belongs to the brand the shopper is already in, so re-entering it
   * would be a no-op at best — the product link is the useful destination
   * there, and a banner without one simply does nothing.
   */
  const handlePressBanner = useCallback(
    (banner: Banner) => {
      if (banner.productId) {
        navigateToProductDetail(banner.productId, banner.brandId ?? activeBrand?.brandId ?? '');
        return;
      }
      if (!activeBrand && banner.brandId) {
        navigateToBrandStore(banner.brandId);
      }
    },
    [navigation, activeBrand]
  );

  const navigateToSearch = () => {
    // Search stays inside the storefront the shopper is in.
    navigation.navigate(ShoppingRouteNames.SearchProducts, { brandId: activeBrand?.brandId });
  };

  const navigateToCart = () => {
    navigation.navigate(ShoppingRouteNames.Cart);
  };

  const navigateToBrandList = () => {
    navigation.navigate(ShoppingRouteNames.BrandList);
  };

  const handleLeaveBrand = useCallback(() => {
    dispatch(clearActiveBrand());
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(ShoppingRouteNames.BrandList);
    }
  }, [dispatch, navigation]);

  // ── Render Helpers ────────────────────────

  const handleToggleWishlist = useCallback((item: Product) => {
    dispatch(toggleWishlistItem({ productId: item.productId }));
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
      <View style={styles.categoryImageWrap}>
        {!!item.image && <Image source={{ uri: item.image }} style={styles.categoryImage} />}
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  /**
   * Departments the catalogue actually has. Names come from the brands on
   * screen; the tile image is the first product photo tagged with that name,
   * so the artwork is always real merchandise from a real brand.
   */
  const categories = useMemo<CategoryDef[]>(() => {
    // Inside a storefront these are that brand's departments; on the brand
    // chooser, every brand's. Same rule the featured products follow, so a
    // shopper is never offered a department the storefront cannot fill.
    const source = activeBrand
      ? featuredBrands.filter((b) => b.brandId === activeBrand.brandId)
      : featuredBrands;
    const names: string[] = [];
    source.forEach((b) => {
      (b.categories ?? []).forEach((name) => {
        if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) {
          names.push(name);
        }
      });
    });
    return names.map((name) => {
      const id = name.toLowerCase();
      const match = featuredProducts.find((p) =>
        (p.tags ?? []).some((t) => String(t).toLowerCase() === id)
      );
      return { id, name, image: match?.images?.[0] };
    });
  }, [featuredBrands, featuredProducts, activeBrand]);

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
      {/* Light glyphs over the orange header, drawn edge to edge under it. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ──────────────────────────────────────────────────────────
          The module-page header healthcare and home services use — a
          gradient under the status bar with a rounded bottom — in shopping's
          orange (see ShoppingHeader's `tone`). */}
      <ShoppingHeader
        tone="gradient"
        title={activeBrand?.name ?? 'Shop'}
        subtitle={activeBrand?.tagline ?? 'Discover amazing brands'}
        // Without this there is no in-app way back out of a brand to switch
        // to another one — only the OS back gesture.
        showBack={!!activeBrand}
        onBack={handleLeaveBrand}
        rightContent={
          <>
            <TouchableOpacity
              style={styles.walletChip}
              onPress={() => navigation.navigate('WalletScreen' as never)}
              activeOpacity={0.75}
              accessibilityLabel="Wallet balance"
            >
              <Wallet size={13} stroke={ShopColors.primaryDark} strokeWidth={2} />
              {/* Same symbol helper as the wallet card below, so the two agree;
                  grouped digits so a balance reads "₨21,280", not "₨21280". */}
              <Text style={styles.walletChipText}>
                {currencySymbol(walletCurrency)}
                {Math.round(walletBalance || 0).toLocaleString('en-PK')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={navigateToCart} accessibilityLabel="Cart">
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
        searchPlaceholder="Search products"
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
        {/* ── Banners Carousel (renders nothing when this storefront has
            no banners of its own) ────────────── */}
        <BannerCarousel
          banners={visibleBanners}
          itemWidth={BANNER_WIDTH}
          itemHeight={BANNER_HEIGHT}
          autoScroll
          style={styles.bannerSection}
          onPressBanner={handlePressBanner}
        />

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

        {/* The tab bar is docked, so it already reserves its own space and the
            system inset — this is just breathing room under the last row. */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
};

// ── Styles ──────────────────────────────────

const makeStyles = (Colors: ColorType, ShopColors: ReturnType<typeof makeShopColors>) =>
  StyleSheet.create({
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

  // White pills on the orange header. The chip's text is ink: at 12pt it
  // needs 4.5:1, and even the deep orange only manages 4.17:1 on white (the
  // brand orange on the old pale chip was 2.7:1). The icon carries the colour.
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ShopColors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  walletChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: ShopColors.surfaceElevated,
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

  // Banners — the strip itself lives in components/Shopping/BannerCarousel.
  bannerSection: {
    marginTop: Spacing.sm,
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
    width: 84,
  },
  categoryImageWrap: {
    width: 84,
    height: 100,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundAlt,
    ...Shadows.small,
    marginBottom: Spacing.xs,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
