import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Heart, Trash2 } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { clearWishlist, fetchWishlist, removeWishlistItem, selectWishlist, type WishlistItemState } from './wishlistSlice';
import ProductCard, { ProductCardSkeleton } from '../../../../components/Shopping/ProductCard';
import { useProductGridSizing } from '../../../../hooks/useProductGridSizing';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', danger: '#E74C3C' };

const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(selectWishlist);
  const { cardWidth, imageHeight } = useProductGridSizing();

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleRemove = useCallback((productId: string, name: string) => {
    Alert.alert('Remove Item', `Remove "${name}" from your wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeWishlistItem(productId)) },
    ]);
  }, [dispatch]);

  const handleClearAll = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert('Clear Wishlist', 'Remove all items from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => dispatch(clearWishlist()) },
    ]);
  }, [dispatch, items.length]);

  const handleViewProduct = useCallback((item: WishlistItemState) => {
    navigation.navigate(ShoppingRouteNames.ProductDetail, {
      productId: item.productId,
      brandId: item.brandId,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: WishlistItemState }) => (
    <ProductCard
      product={{
        productId: item.productId,
        brandId: item.brandId,
        brandName: item.brandName,
        name: item.productName,
        image: item.productImage,
        basePrice: item.originalPrice ?? item.price,
        salePrice: item.originalPrice && item.originalPrice > item.price ? item.price : undefined,
      }}
      width={cardWidth}
      imageHeight={imageHeight}
      onPress={() => handleViewProduct(item)}
      onWishlist={() => handleRemove(item.productId, item.productName)}
      isWishlisted
    />
  ), [handleRemove, handleViewProduct, cardWidth, imageHeight]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator size="small" color={ShopColors.primary} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn't load your wishlist</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => dispatch(fetchWishlist())}>
            <Text style={styles.browseBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Heart size={48} stroke={Colors.borderDark} strokeWidth={1} />
        </View>
        <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
        <Text style={styles.emptySubtitle}>Items you save will appear here so you can easily find them later.</Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => navigation.navigate(ShoppingRouteNames.ShoppingHome)}
        >
          <Text style={styles.browseBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Wishlist ({items.length})</Text>
        {items.length > 0 ? (
          <TouchableOpacity style={styles.iconBtn} onPress={handleClearAll}>
            <Trash2 size={18} stroke={ShopColors.danger} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading && items.length === 0 ? (
        <FlatList
          data={Array.from({ length: 4 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <ProductCardSkeleton width={cardWidth} imageHeight={imageHeight} />}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.productId}
          numColumns={2}
          columnWrapperStyle={items.length > 0 ? styles.columnWrapper : undefined}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: (StatusBar.currentHeight || 0) + 20, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  listContent: { padding: Spacing.lg, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  emptyContainer: { flex: 1, justifyContent: 'center' },

  // Empty
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.backgroundAlt, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  browseBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xxl, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: ShopColors.primary },
  browseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default WishlistScreen;