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
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Star, ChevronRight, Heart, Check, User } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows, makeColors, type ColorType } from '../../../../constants/Colors';
import { ThemeColors, useTheme } from '../../../../theme';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { BrandConfig } from '../../../../types/shopping';
import {
  fetchBrands,
  setSearchQuery,
  setActiveBrand,
  clearActiveBrand,
  selectBrands,
  selectBrandList,
  selectBrandListLoading,
  selectBrandSearchQuery,
} from './brandListSlice';
import { fetchHomeData, selectFeaturedBrands, selectFeaturedProducts, selectBanners, selectShoppingHome } from '../ShoppingHome/shoppingHomeSlice';
import type { Banner } from '../ShoppingHome/shoppingHomeSlice';
import { toggleWishlistItem, selectWishlistItems } from '../Wishlist/wishlistSlice';
import type { Product } from '../../../../types/shopping';
import { ShoppingHeader } from '../../../../components/Shopping/ShoppingHeader';

// A function of the ramp, not a frozen table: every ground below is a
// light surface, and a frozen one is a white card on a dark page.
const makeShopColors = (c: ThemeColors) => ({
  primary: c.accent,
  primaryDark: c.accentDeep,
  primaryLight: c.accentSoft,
  accent: c.star,
  surface: c.surface,
  backgroundAlt: c.bg,
  textPrimary: c.ink,
  textSecondary: c.inkMuted,
  textMuted: c.inkFaint,
  border: c.line,
  success: c.success,
});

const BrandListScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const ShopColors = useMemo(() => makeShopColors(colors), [colors]);
  const styles = useMemo(() => makeStyles(Colors, ShopColors), [Colors, ShopColors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const brands = useAppSelector(selectBrands);
  const { refreshing, hasMore, page, error } = useAppSelector(selectBrandList);
  const loading = useAppSelector(selectBrandListLoading);
  const searchQuery = useAppSelector(selectBrandSearchQuery);

  const featuredBrands = useAppSelector(selectFeaturedBrands);
  const featuredProducts = useAppSelector(selectFeaturedProducts);
  const banners = useAppSelector(selectBanners);
  const homeState = useAppSelector(selectShoppingHome);
  const homeLoading = homeState.loading;
  const wishlistItems = useAppSelector(selectWishlistItems);
  const wishlistIds = new Set(wishlistItems.map(i => i.productId));

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    dispatch(fetchBrands({ page: 1, refresh: true }));
    dispatch(fetchHomeData(false));
  }, [dispatch]);

  // Being back on the brand chooser means no storefront is active. Clearing
  // it here also covers leaving a brand by the OS back gesture, which never
  // ran the in-app back handler.
  useFocusEffect(
    useCallback(() => {
      dispatch(clearActiveBrand());
    }, [dispatch])
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchBrands({ page: 1, refresh: true }));
    dispatch(fetchHomeData(true));
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchBrands({ page: page + 1 }));
    }
  }, [dispatch, loading, hasMore, page]);

  const handleSearch = useCallback((text: string) => {
    setLocalSearch(text);
    dispatch(setSearchQuery(text));
  }, [dispatch]);

  const handleClearSearch = useCallback(() => {
    setLocalSearch('');
    dispatch(setSearchQuery(''));
  }, [dispatch]);

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [brands, searchQuery]);

  // Entering a brand makes it the active storefront: the tabs behind this
  // navigation render that brand's name and only its wishlist items, so the
  // identity has to be recorded before we push.
  const openBrand = useCallback((brand: BrandConfig) => {
    dispatch(setActiveBrand({
      brandId: brand.brandId,
      name: brand.name,
      tagline: brand.tagline,
    }));
    navigation.navigate(ShoppingRouteNames.ShoppingTabs, { brandId: brand.brandId });
  }, [dispatch, navigation]);

  // Banners only carry a brandId, so resolve it against the loaded catalogue.
  const openBrandById = useCallback((brandId: string) => {
    const brand =
      brands.find((b) => b.brandId === brandId) ??
      featuredBrands.find((b) => b.brandId === brandId);
    if (brand) {
      openBrand(brand);
    } else {
      navigation.navigate(ShoppingRouteNames.ShoppingTabs, { brandId });
    }
  }, [brands, featuredBrands, openBrand, navigation]);

  const navigateToProductDetail = (productId: string, brandId: string) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, { productId, brandId });
  };

  const PRODUCT_CARD_WIDTH = 160;

  // ── Render Helpers ────────────────────────

  const renderBanner = ({ item }: { item: Banner }) => (
    <TouchableOpacity
      style={styles.bannerCard}
      activeOpacity={0.9}
      onPress={() => {
        if (item.brandId) openBrandById(item.brandId);
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
              dispatch(toggleWishlistItem({ productId: item.productId }));
            }}
          >
            <Heart
              size={16}
              stroke={wishlistIds.has(item.productId) ? Colors.error : Colors.text.tertiary}
              fill={wishlistIds.has(item.productId) ? Colors.error : 'none'}
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

  const renderSmallBrandCard = ({ item }: { item: BrandConfig }) => (
    <TouchableOpacity
      style={styles.smallBrandCard}
      activeOpacity={0.7}
      onPress={() => openBrand(item)}
    >
      <View style={[styles.brandLogoWrap, { borderColor: item.primaryColor || ShopColors.primary }]}>
        <Image source={{ uri: item.logo }} style={styles.brandLogoSmall} />
      </View>
      <Text style={styles.smallBrandName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const [bannerIndex, setBannerIndex] = useState(0);
  const BANNER_WIDTH = 320;

  // ── Render: Large Brand Card ───────────────

  const renderBrandCard = ({ item }: { item: BrandConfig }) => {
    const visibleCategories = item.categories.slice(0, 2);
    const overflowCount = item.categories.length - visibleCategories.length;

    return (
      <TouchableOpacity
        style={styles.heroCard}
        activeOpacity={0.9}
        onPress={() => openBrand(item)}
      >
        <Image source={{ uri: item.bannerImage }} style={styles.heroBannerImg} />
        {/* Bottom-weighted scrim rather than a flat wash: the banner stays
            legible as artwork up top, while the copy sits on near-solid ink
            so it reads on bright photos too. */}
        <LinearGradient
          colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName} numberOfLines={1}>{item.name}</Text>
            {item.isActive && (
              <View style={styles.verifiedBadge}>
                <Check size={11} stroke="#FFF" strokeWidth={3} />
              </View>
            )}
          </View>
          <Text style={styles.heroTagline} numberOfLines={1}>{item.tagline}</Text>
          <Text style={styles.heroDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.heroFooter}>
            <View style={styles.heroCategoriesRow}>
              {visibleCategories.map((cat, i) => (
                <View key={i} style={styles.heroCategoryChip}>
                  <Text style={styles.heroCategoryText}>{cat}</Text>
                </View>
              ))}
              {overflowCount > 0 && (
                <View style={styles.heroCategoryChip}>
                  <Text style={styles.heroCategoryText}>+{overflowCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.heroShopBtn}>
              <Text style={styles.heroShopBtnText}>Shop Now</Text>
              <ChevronRight size={14} stroke="#FFF" strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render: Section Header ─────────────────

  const renderHeader = () => {
    const isSearching = searchQuery.trim().length > 0;
    
    return (
      <View style={styles.listHeader}>
        {!isSearching && (
          <>
            {/* ── Banners Carousel (server-driven; hidden when empty) ── */}
            {banners.length > 0 && (
            <View style={styles.bannerSection}>
              <FlatList
                data={banners}
                renderItem={renderBanner}
                keyExtractor={(item) => item.bannerId}
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
              {banners.length > 1 && (
                <View style={styles.dotsRow}>
                  {banners.map((_, i: number) => (
                    <View
                      key={i}
                      style={[styles.dot, i === bannerIndex ? styles.dotActive : {}]}
                    />
                  ))}
                </View>
              )}
            </View>
            )}

            {/* ── Featured Brands ────────────────── */}
            {featuredBrands.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Featured Brands</Text>
                    <Text style={styles.sectionSubtitle}>{featuredBrands.length} top brands</Text>
                  </View>
                </View>
                <FlatList
                  data={featuredBrands}
                  renderItem={renderSmallBrandCard}
                  keyExtractor={(item) => item.brandId}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
                  ItemSeparatorComponent={() => <View style={{ width: Spacing.lg }} />}
                />
              </View>
            )}


          </>
        )}

        {/* ── All Brands Title ───────────────── */}
        {filteredBrands.length > 0 && (
          <View style={[styles.sectionHeader, { marginTop: isSearching ? 0 : Spacing.md }]}>
            <Text style={styles.sectionTitle}>
              {isSearching ? 'Search Results' : 'All Brands'}
            </Text>
            <Text style={styles.sectionCount}>
              {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <ShoppingBag size={40} stroke={ShopColors.textMuted} strokeWidth={1.25} />
        </View>
        <Text style={styles.emptyTitle}>
          {searchQuery ? 'No results found' : 'No brands yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? `No brands match "${searchQuery}"` : 'Pull down to refresh and discover brands'}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || brands.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={ShopColors.primary} />
      </View>
    );
  };

  // Brands to show in the list
  const listBrands = useMemo(() => {
    return filteredBrands;
  }, [filteredBrands]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={ShopColors.surface} />

      {/* ── Header ──────────────────────────── */}
      <ShoppingHeader
        title="Explore"
        subtitle="Discover premium brands & stores"
        // BrandList is NOT a tab root — it is only ever reached by drilling in
        // from the shopping home, so without a back control the user is
        // stranded here with no way out except the OS gesture.
        showBack
        rightContent={
          // The account, painted in shopping's own orange — the profile screen
          // is registered once on the Base stack and takes its module from
          // whoever opened it.
          //
          // This slot used to hold an orders shortcut, which was the only
          // lasting way into the cross-brand history (the per-brand tabs show
          // one store each). That entry did not disappear with it: it is now a
          // My Orders row inside the profile, which is where an account-level
          // list belongs anyway.
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('UserProfileScreen', { module: 'shopping' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
          >
            <User size={22} stroke={ShopColors.textPrimary} strokeWidth={1.75} />
          </TouchableOpacity>
        }
        showSearch={true}
        searchPlaceholder="Search brands..."
        searchValue={localSearch}
        onSearchChange={handleSearch}
        onClearSearch={handleClearSearch}
      />

      {/* ── Brand List ──────────────────────── */}
      {loading && brands.length === 0 ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBrandedWrap}>
            <Text style={styles.loadingEmoji}>🛍️</Text>
            <ActivityIndicator size="large" color={ShopColors.primary} style={{ marginTop: 16 }} />
            <Text style={styles.loadingText}>Discovering brands...</Text>
            <Text style={styles.loadingSubtext}>Finding the best shops for you</Text>
          </View>
        </View>
      ) : !!error && brands.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Couldn't load brands</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listBrands}
          keyExtractor={(item) => item.brandId}
          renderItem={renderBrandCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
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
    </View>
  );
};

// ── Styles ──────────────────────────────────

const makeStyles = (Colors: ColorType, ShopColors: ReturnType<typeof makeShopColors>) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ShopColors.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingBrandedWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingEmoji: {
    fontSize: 48,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: ShopColors.textPrimary,
    marginTop: 8,
  },
  loadingSubtext: {
    fontSize: 13,
    color: ShopColors.textMuted,
    marginTop: 4,
  },
  
  // Error state



  // List
  listContent: {
    paddingBottom: 100,
    paddingTop: 10,
  },

  // Large Brand Card (Hero Style)
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    height: 220,
    // Placeholder ink so the card reads as a card while the banner loads,
    // instead of flashing a white block against the grey list.
    backgroundColor: Colors.text.primary,
    ...Shadows.medium,
  },
  heroBannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.4,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ShopColors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 3,
  },
  heroDescription: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 14,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCategoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // Without this the chips push the button off the card edge — three
    // categories used to clip "Shop Now" on narrow screens.
    flexShrink: 1,
  },
  heroCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  heroShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ShopColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 4,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  heroShopBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ShopColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ShopColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: ShopColors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ShopColors.textPrimary,
  },
  errorMessage: {
    fontSize: 14,
    color: ShopColors.textSecondary,
    textAlign: 'center',
    marginHorizontal: 40,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: ShopColors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Mega Feed Styles ─────────────────────

  bannerSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerCard: {
    width: 320,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: ShopColors.backgroundAlt,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    backgroundColor: ShopColors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: ShopColors.primary,
    borderRadius: 3,
  },

  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listHeader: {
    paddingBottom: Spacing.md,
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
    color: ShopColors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    color: ShopColors.textMuted,
    fontWeight: '500',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ShopColors.textMuted,
    marginTop: 2,
  },
  seeAllBtn: {
    backgroundColor: ShopColors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(230,126,34,0.15)',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: ShopColors.primary,
  },

  smallBrandCard: {
    alignItems: 'center',
    width: 80,
  },
  brandLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ShopColors.surface,
    ...Shadows.small,
    marginBottom: Spacing.xs,
  },
  brandLogoSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  smallBrandName: {
    fontSize: 11,
    fontWeight: '500',
    color: ShopColors.textSecondary,
    textAlign: 'center',
  },

  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
  },
  searchBarContainer: {
    backgroundColor: ShopColors.surface,
  },
  headerBtn: {
    padding: 8,
    marginLeft: 8,
  },
  productCard: {
    backgroundColor: ShopColors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  productImageWrap: {
    width: '100%',
    height: 160 * 1.1,
    backgroundColor: ShopColors.backgroundAlt,
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
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
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
    borderRadius: 15,
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
    color: ShopColors.textPrimary,
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
    color: ShopColors.textPrimary,
  },
  reviewCount: {
    fontSize: 11,
    color: ShopColors.textMuted,
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
    fontSize: 11,
    color: ShopColors.textMuted,
    textDecorationLine: 'line-through',
  },

  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});

export default BrandListScreen;
