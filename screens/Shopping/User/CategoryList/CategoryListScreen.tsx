import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, ChevronDown, ChevronRight, Grid3X3, Package } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { Category } from '../../../../types/shopping';
import {
  fetchCategories,
  toggleCategory,
  selectCategories,
  selectExpandedIds,
  selectCategoryListLoading,
  selectCategoryList,
} from './categoryListSlice';

const ShopColors = {
  primary: '#E67E22',
  primaryLight: '#FFF3E6',
  accent: '#F39C12',
};

const CategoryListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const brandId = route.params?.brandId as string | undefined;
  const categories = useAppSelector(selectCategories);
  const expandedIds = useAppSelector(selectExpandedIds);
  const loading = useAppSelector(selectCategoryListLoading);
  const { error } = useAppSelector(selectCategoryList);

  useEffect(() => {
    dispatch(fetchCategories(brandId));
  }, [dispatch, brandId]);

  const handleToggle = useCallback((categoryId: string) => {
    dispatch(toggleCategory(categoryId));
  }, [dispatch]);

  const handleCategoryPress = (category: Category) => {
    if (category.children && category.children.length > 0) {
      handleToggle(category.categoryId);
    } else {
      navigation.navigate(ShoppingRouteNames.ProductList, {
        brandId: brandId || '',
        categoryId: category.categoryId,
      });
    }
  };

  const navigateToProducts = (categoryId: string) => {
    navigation.navigate(ShoppingRouteNames.ProductList, {
      brandId: brandId || '',
      categoryId,
    });
  };

  // ── Render Category Item ──────────────────

  const renderCategoryItem = (category: Category, depth: number = 0) => {
    const isExpanded = expandedIds.includes(category.categoryId);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <View key={category.categoryId}>
        <TouchableOpacity
          style={[
            styles.categoryRow,
            { paddingLeft: Spacing.lg + depth * Spacing.xl },
            depth === 0 && styles.categoryRowRoot,
          ]}
          activeOpacity={0.6}
          onPress={() => handleCategoryPress(category)}
        >
          <View style={[styles.categoryIconWrap, depth === 0 && { backgroundColor: ShopColors.primaryLight }]}>
            {category.icon ? (
              <Text style={styles.categoryIconText}>{category.icon}</Text>
            ) : (
              <Grid3X3 size={18} stroke={depth === 0 ? ShopColors.primary : Colors.text.tertiary} strokeWidth={1.75} />
            )}
          </View>

          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, depth === 0 && styles.categoryNameRoot]}>
              {category.name}
            </Text>
            <Text style={styles.productCount}>
              {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
            </Text>
          </View>

          {hasChildren ? (
            <View style={styles.expandIcon}>
              {isExpanded ? (
                <ChevronDown size={18} stroke={Colors.text.tertiary} strokeWidth={1.75} />
              ) : (
                <ChevronRight size={18} stroke={Colors.text.tertiary} strokeWidth={1.75} />
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigateToProducts(category.categoryId)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewBtnText}>View</Text>
              <ChevronRight size={14} stroke={ShopColors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* ── Subcategories ──────────────────── */}
        {hasChildren && isExpanded && (
          <View style={styles.childrenWrap}>
            {category.children.map((child) => renderCategoryItem(child, depth + 1))}
            {/* View all in this category */}
            <TouchableOpacity
              style={[styles.viewAllRow, { paddingLeft: Spacing.lg + (depth + 1) * Spacing.xl }]}
              onPress={() => navigateToProducts(category.categoryId)}
            >
              <Package size={14} stroke={ShopColors.primary} strokeWidth={1.75} />
              <Text style={styles.viewAllText}>View all in {category.name}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ShopColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Category List ───────────────────── */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchCategories(brandId))}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.categoryId}
          renderItem={({ item }) => renderCategoryItem(item, 0)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No categories found</Text>
              <Text style={styles.emptySubtitle}>Categories will appear here once available</Text>
            </View>
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // List
  listContent: {
    paddingVertical: Spacing.sm,
    paddingBottom: 100,
  },

  // Category Row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  categoryRowRoot: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  categoryNameRoot: {
    fontSize: 15,
    fontWeight: '600',
  },
  productCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  expandIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ShopColors.primary,
  },

  // Children
  childrenWrap: {
    backgroundColor: Colors.backgroundAlt,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: ShopColors.primary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: ShopColors.primary,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
});

export default CategoryListScreen;
