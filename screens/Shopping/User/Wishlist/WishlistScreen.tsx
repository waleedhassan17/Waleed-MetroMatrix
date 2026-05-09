import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Heart, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { clearWishlist, removeWishlistItem, selectWishlist, type WishlistItemState } from './wishlistSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', danger: '#E74C3C' };
const CURRENCY = 'PKR';

const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector(selectWishlist);

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

  const renderItem = useCallback(({ item }: { item: WishlistItemState }) => {
    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => handleViewProduct(item)}>
        <Image source={{ uri: item.productImage }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.brandLabel}>{item.brandName}</Text>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.productName}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{CURRENCY} {item.price.toLocaleString()}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>{CURRENCY} {item.originalPrice!.toLocaleString()}</Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item.productId, item.productName)}>
            <X size={16} stroke={Colors.text.tertiary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={() => handleViewProduct(item)}>
            <ShoppingCart size={16} stroke="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [handleRemove, handleViewProduct]);

  const renderEmpty = () => (
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

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: (StatusBar.currentHeight || 0) + 12, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  listContent: { padding: Spacing.lg, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center' },

  // Card
  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', ...Shadows.small },
  cardImage: { width: 100, height: 120, resizeMode: 'cover', backgroundColor: Colors.backgroundAlt },
  cardBody: { flex: 1, padding: Spacing.md, justifyContent: 'center' },
  brandLabel: { fontSize: 11, fontWeight: '600', color: ShopColors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  priceText: { fontSize: 15, fontWeight: '700', color: ShopColors.primary },
  originalPrice: { fontSize: 12, color: Colors.text.tertiary, textDecorationLine: 'line-through' },
  cardActions: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  removeBtn: { width: 32, height: 32, borderRadius: BorderRadius.full, backgroundColor: Colors.backgroundAlt, justifyContent: 'center', alignItems: 'center' },
  cartBtn: { width: 36, height: 36, borderRadius: BorderRadius.full, backgroundColor: ShopColors.primary, justifyContent: 'center', alignItems: 'center' },

  // Empty
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.backgroundAlt, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  browseBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xxl, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: ShopColors.primary },
  browseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default WishlistScreen;