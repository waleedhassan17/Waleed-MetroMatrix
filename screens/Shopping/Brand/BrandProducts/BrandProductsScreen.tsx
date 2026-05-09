import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, Search, Edit3, Trash2, Package } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type { Product } from '../../../../types/shopping';
import { removeProduct, selectBrandProducts, setSearchQuery, setStockFilter } from './brandProductsSlice';

const filterLabels: { key: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_stock', label: 'In stock' },
  { key: 'low_stock', label: 'Low stock' },
  { key: 'out_of_stock', label: 'Out of stock' },
];

const BrandProductsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { products, searchQuery, stockFilter } = useAppSelector(selectBrandProducts);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = [product.name, product.sku, product.tags.join(' ')].join(' ').toLowerCase().includes(searchQuery.toLowerCase());
      const stockQuantity = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'in_stock'
            ? stockQuantity > 5
            : stockFilter === 'low_stock'
              ? stockQuantity > 0 && stockQuantity <= 5
              : stockQuantity === 0;
      return matchesSearch && matchesStock;
    });
  }, [products, searchQuery, stockFilter]);

  const handleDelete = (product: Product) => {
    Alert.alert('Delete product', `Remove ${product.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeProduct(product.productId)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate(BrandRouteNames.AddProduct)}>
          <Plus size={20} stroke={Colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} stroke={Colors.text.secondary} strokeWidth={2} />
        <TextInput placeholder="Search products" placeholderTextColor={Colors.text.tertiary} value={searchQuery} onChangeText={(text) => dispatch(setSearchQuery(text))} style={styles.searchInput} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {filterLabels.map((item) => {
          const active = stockFilter === item.key;
          return (
            <TouchableOpacity key={item.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => dispatch(setStockFilter(item.key))}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredProducts.map((product) => {
          const stockQuantity = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
          const hasDiscount = Boolean(product.salePrice && product.salePrice < product.basePrice);
          return (
            <View key={product.productId} style={styles.card}>
              <Image source={{ uri: product.images[0] }} style={styles.image} />
              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.stockBadge}>{stockQuantity} stock</Text>
                </View>
                <Text style={styles.productMeta}>{product.sku}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>PKR {(product.salePrice ?? product.basePrice).toLocaleString()}</Text>
                  {hasDiscount && <Text style={styles.oldPrice}>PKR {product.basePrice.toLocaleString()}</Text>}
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate(BrandRouteNames.EditProduct, { productId: product.productId })}>
                    <Edit3 size={14} stroke={Colors.primary} strokeWidth={2} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(product)}>
                    <Trash2 size={14} stroke={Colors.error} strokeWidth={2} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={24} stroke={Colors.text.tertiary} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try a different search or stock filter.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, ...Shadows.sm },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text.primary },
  filtersRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, ...Shadows.sm },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  filterTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: { marginBottom: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, overflow: 'hidden', ...Shadows.sm },
  image: { width: '100%', height: 180, backgroundColor: Colors.backgroundAlt },
  cardBody: { padding: Spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  productName: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  stockBadge: { fontSize: 11, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full },
  productMeta: { marginTop: 4, fontSize: 12, color: Colors.text.secondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  price: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  oldPrice: { fontSize: 12, color: Colors.text.tertiary, textDecorationLine: 'line-through' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.backgroundAlt },
  actionText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  emptyText: { fontSize: 12, color: Colors.text.secondary },
});

export default BrandProductsScreen;