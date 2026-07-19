import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, Search, Edit3, Trash2, Package, X } from 'lucide-react-native';
import { Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type { Product } from '../../../../types/shopping';
import { fetchBrandProducts,
  removeProduct, selectBrandProducts, setSearchQuery, setStockFilter } from './brandProductsSlice';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryLight: '#FFF5EB',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
};

const getStockStyle = (qty: number) => {
  if (qty === 0) return { bg: B.errorLight, text: B.error, label: 'Out of stock' };
  if (qty <= 5) return { bg: B.warningLight, text: B.warning, label: `${qty} left` };
  return { bg: B.successLight, text: B.success, label: `${qty} in stock` };
};

const filterLabels: { key: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_stock', label: 'In Stock' },
  { key: 'low_stock', label: 'Low Stock' },
  { key: 'out_of_stock', label: 'Sold Out' },
];

const BrandProductsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { products, searchQuery, stockFilter } = useAppSelector(selectBrandProducts);

  useEffect(() => {
    dispatch(fetchBrandProducts());
  }, [dispatch]);

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
    Alert.alert('Delete product', `Remove "${product.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeProduct(product.productId)) },
    ]);
  };

  const renderProduct = ({ item: product }: { item: Product }) => {
    const stockQuantity = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
    const hasDiscount = Boolean(product.salePrice && product.salePrice < product.basePrice);
    const stock = getStockStyle(stockQuantity);
    const discountPct = hasDiscount ? Math.round((1 - (product.salePrice! / product.basePrice)) * 100) : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: product.images[0] }} style={styles.image} />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPct}%</Text>
            </View>
          )}
          <View style={[styles.stockTag, { backgroundColor: stock.bg }]}>
            <View style={[styles.stockDot, { backgroundColor: stock.text }]} />
            <Text style={[styles.stockTagText, { color: stock.text }]}>{stock.label}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productSku}>{product.sku} · {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₨{(product.salePrice ?? product.basePrice).toLocaleString()}</Text>
            {hasDiscount && <Text style={styles.oldPrice}>₨{product.basePrice.toLocaleString()}</Text>}
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate(BrandRouteNames.EditProduct, { productId: product.productId })}>
              <Edit3 size={14} stroke={B.primary} strokeWidth={2} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(product)}>
              <Trash2 size={14} stroke={B.error} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Products</Text>
          <Text style={styles.countLabel}>{products.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate(BrandRouteNames.AddProduct)}>
          <Plus size={18} stroke="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrap}>
          <Search size={16} stroke={B.textMuted} strokeWidth={2} />
          <TextInput
            placeholder="Search by name, SKU, or tag..."
            placeholderTextColor={B.textMuted}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <X size={16} stroke={B.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterLabels}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersRow}
          renderItem={({ item }) => {
            const active = stockFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => dispatch(setStockFilter(item.key))}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.productId}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Package size={32} stroke={B.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search term.' : 'Add your first product to get started.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate(BrandRouteNames.AddProduct)}>
                <Plus size={16} stroke="#FFF" strokeWidth={2} />
                <Text style={styles.emptyCtaText}>Add Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_H + 10,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: B.text },
  countLabel: { fontSize: 12, fontWeight: '600', color: B.textMuted, marginTop: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.primary,
  },

  // Search
  searchSection: {
    backgroundColor: B.surface,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: B.bg,
  },
  searchInput: { flex: 1, fontSize: 14, color: B.text, padding: 0 },
  filtersRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: B.bg,
    borderWidth: 1,
    borderColor: B.border,
  },
  filterChipActive: {
    backgroundColor: B.primary,
    borderColor: B.primary,
  },
  filterText: { fontSize: 12, fontWeight: '700', color: B.textSec },
  filterTextActive: { color: '#FFF' },

  // List
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: B.surface,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardImageWrap: { position: 'relative' },
  image: { width: '100%', height: 170, backgroundColor: '#F1F5F9' },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: B.error,
  },
  discountText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  stockTag: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockTagText: { fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14 },
  productName: { fontSize: 15, fontWeight: '800', color: B.text },
  productSku: { fontSize: 12, color: B.textMuted, marginTop: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  price: { fontSize: 16, fontWeight: '800', color: B.text },
  oldPrice: { fontSize: 13, color: B.textMuted, textDecorationLine: 'line-through' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: B.primaryLight,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: B.primary },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.errorLight,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: B.text },
  emptyText: { fontSize: 13, color: B.textMuted, textAlign: 'center', maxWidth: 240 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: B.primary,
  },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

export default BrandProductsScreen;