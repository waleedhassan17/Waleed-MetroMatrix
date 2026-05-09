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
import { useNavigation } from '@react-navigation/native';
import { Search, X, ShoppingBag, Star, ChevronRight } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { BrandConfig } from '../../../../types/shopping';
import {
  fetchBrands,
  setSearchQuery,
  selectBrands,
  selectBrandList,
  selectBrandListLoading,
  selectBrandSearchQuery,
} from './brandListSlice';

const ShopColors = {
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF8F0',
  accent: '#F39C12',
  surface: '#FFFFFF',
  backgroundAlt: '#F8F9FA',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
};

const BrandListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const brands = useAppSelector(selectBrands);
  const { refreshing, hasMore, page } = useAppSelector(selectBrandList);
  const loading = useAppSelector(selectBrandListLoading);
  const searchQuery = useAppSelector(selectBrandSearchQuery);

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    dispatch(fetchBrands({ page: 1, refresh: true }));
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchBrands({ page: 1, refresh: true }));
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

  const navigateToBrandStore = (brandId: string) => {
    navigation.navigate(ShoppingRouteNames.BrandStore, { brandId });
  };

  // ── Render: Featured Brand (first brand gets hero card) ──

  const renderHeroBrand = (brand: BrandConfig) => (
    <TouchableOpacity
      style={styles.heroCard}
      activeOpacity={0.85}
      onPress={() => navigateToBrandStore(brand.brandId)}
    >
      <Image source={{ uri: brand.bannerImage }} style={styles.heroBannerImg} />
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <View style={styles.heroLogoRow}>
          <View style={styles.heroLogoWrap}>
            <Image source={{ uri: brand.logo }} style={styles.heroLogo} />
          </View>
          <View style={styles.heroTextWrap}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{brand.name}</Text>
              <View style={styles.verifiedBadge}>
                <Star size={10} stroke="#FFF" fill="#FFF" />
              </View>
            </View>
            <Text style={styles.heroTagline}>{brand.tagline}</Text>
          </View>
        </View>
        <Text style={styles.heroDescription} numberOfLines={2}>
          {brand.description}
        </Text>
        <View style={styles.heroFooter}>
          <View style={styles.heroCategoriesRow}>
            {brand.categories.slice(0, 3).map((cat, i) => (
              <View key={i} style={styles.heroCategoryChip}>
                <Text style={styles.heroCategoryText}>{cat}</Text>
              </View>
            ))}
          </View>
          <View style={styles.heroShopBtn}>
            <Text style={styles.heroShopBtnText}>Shop Now</Text>
            <ChevronRight size={14} stroke="#FFF" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Render: Regular brand card ────────────

  const renderBrandCard = ({ item }: { item: BrandConfig }) => (
    <TouchableOpacity
      style={styles.brandCard}
      activeOpacity={0.8}
      onPress={() => navigateToBrandStore(item.brandId)}
    >
      <View style={styles.brandCardLeft}>
        <View style={[styles.brandLogoContainer, { borderColor: `${item.primaryColor}30` }]}>
          <Image source={{ uri: item.logo }} style={styles.brandLogo} />
        </View>
        <View style={styles.brandCardInfo}>
          <View style={styles.brandNameRow}>
            <Text style={styles.brandName} numberOfLines={1}>{item.name}</Text>
            {item.isActive && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text style={styles.brandTagline} numberOfLines={1}>{item.tagline}</Text>
          <View style={styles.brandMeta}>
            <View style={styles.brandMetaItem}>
              <ShoppingBag size={11} stroke={ShopColors.textMuted} strokeWidth={1.75} />
              <Text style={styles.brandMetaText}>
                {item.categories.length} {item.categories.length === 1 ? 'Category' : 'Categories'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <ChevronRight size={18} stroke={ShopColors.textMuted} strokeWidth={1.75} />
    </TouchableOpacity>
  );

  // ── Render: Header section ────────────────

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Hero brand (first brand gets spotlight) */}
      {filteredBrands.length > 0 && !searchQuery.trim() && renderHeroBrand(filteredBrands[0])}

      {/* Section title */}
      {filteredBrands.length > (searchQuery.trim() ? 0 : 1) && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim() ? 'Search Results' : 'All Brands'}
          </Text>
          <Text style={styles.sectionCount}>
            {searchQuery.trim() ? filteredBrands.length : filteredBrands.length - 1} brand{filteredBrands.length !== 2 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <ShoppingBag size={40} stroke={ShopColors.textMuted} strokeWidth={1.25} />
        </View>
        <Text style={styles.emptyTitle}>No brands found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'Try a different search term' : 'Pull down to refresh'}
        </Text>
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

  // Brands to show in the list (skip first one since it's the hero)
  const listBrands = useMemo(() => {
    if (searchQuery.trim()) return filteredBrands;
    return filteredBrands.slice(1);
  }, [filteredBrands, searchQuery]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ShopColors.surface} />

      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Shop</Text>
            <Text style={styles.headerSubtitle}>Discover your favorite brands</Text>
          </View>
        </View>

        {/* ── Search Bar ────────────────────── */}
        <View style={styles.searchBar}>
          <Search size={18} stroke={ShopColors.textMuted} strokeWidth={1.75} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search brands..."
            placeholderTextColor={ShopColors.textMuted}
            value={localSearch}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {localSearch.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} stroke={ShopColors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Brand List ──────────────────────── */}
      {loading && brands.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ShopColors.primary} />
          <Text style={styles.loadingText}>Loading brands...</Text>
        </View>
      ) : (
        <FlatList
          data={listBrands}
          renderItem={renderBrandCard}
          keyExtractor={(item) => item.brandId}
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

const styles = StyleSheet.create({
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
  loadingText: {
    fontSize: 14,
    color: ShopColors.textSecondary,
  },

  // Header
  header: {
    backgroundColor: ShopColors.surface,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: ShopColors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: ShopColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: ShopColors.textSecondary,
    marginTop: 2,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ShopColors.backgroundAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: ShopColors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: ShopColors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ShopColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    paddingBottom: 4,
  },

  // Hero Card
  heroCard: {
    margin: 20,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    height: 220,
    ...Shadows.medium,
  },
  heroBannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  heroTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.3,
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
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 14,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCategoriesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  heroCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  heroShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ShopColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  heroShopBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ShopColors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    color: ShopColors.textMuted,
    fontWeight: '500',
  },

  // Brand Card
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ShopColors.surface,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ShopColors.border,
  },
  brandCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandLogoContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ShopColors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brandCardInfo: {
    marginLeft: 14,
    flex: 1,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
    color: ShopColors.textPrimary,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ShopColors.success,
  },
  brandTagline: {
    fontSize: 13,
    color: ShopColors.textSecondary,
    marginTop: 2,
  },
  brandMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  brandMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandMetaText: {
    fontSize: 11,
    color: ShopColors.textMuted,
    fontWeight: '500',
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
  },

  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});

export default BrandListScreen;
