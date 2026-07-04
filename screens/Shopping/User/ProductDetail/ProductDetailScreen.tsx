import React, { useEffect, useCallback, useMemo, useRef } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Heart,
  Share2,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { ProductVariant } from '../../../../types/shopping';
import {
  fetchProductDetail,
  addToCart,
  setSelectedSize,
  setSelectedColor,
  setQuantity,
  setActiveTab,
  setImageIndex,
  toggleWishlistWithPersist,
  resetProductDetail,
  selectProductDetail,
  selectProduct,
  selectSelectedVariant,
  selectProductDetailLoading,
  selectProductReviews,
  selectCurrentPrice,
} from './productDetailSlice';
import { selectIsInWishlist } from '../Wishlist/wishlistSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.05;

const ShopColors = {
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF3E6',
  accent: '#F39C12',
  badge: '#E74C3C',
  success: '#27AE60',
};

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const galleryRef = useRef<FlatList>(null);

  const productId = route.params?.productId as string;
  const brandId = route.params?.brandId as string;

  const product = useAppSelector(selectProduct);
  const selectedVariant = useAppSelector(selectSelectedVariant);
  const loading = useAppSelector(selectProductDetailLoading);
  const reviews = useAppSelector(selectProductReviews);
  const { price, originalPrice, hasDiscount } = useAppSelector(selectCurrentPrice);
  const {
    selectedSize,
    selectedColor,
    quantity,
    activeTab,
    imageIndex,
    addToCartLoading,
    error,
  } = useAppSelector(selectProductDetail);
  const isWishlisted = useAppSelector(selectIsInWishlist(productId));

  useEffect(() => {
    if (productId) {
      dispatch(fetchProductDetail(productId));
    }
    return () => {
      dispatch(resetProductDetail());
    };
  }, [dispatch, productId]);

  // ── Derived data ──────────────────────────

  const availableSizes = useMemo(() => {
    if (!product) return [];
    const sizes = [...new Set(product.variants.filter((v) => v.size).map((v) => v.size!))];
    return sizes;
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    const colorMap = new Map<string, string>();
    product.variants
      .filter((v) => v.color)
      .forEach((v) => {
        if (!colorMap.has(v.color!)) {
          colorMap.set(v.color!, v.colorCode || '#888');
        }
      });
    return Array.from(colorMap.entries()).map(([name, code]) => ({ name, code }));
  }, [product]);

  const discountPercent = useMemo(() => {
    if (!hasDiscount) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }, [hasDiscount, originalPrice, price]);

  // ── Handlers ──────────────────────────────

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariant) {
      Alert.alert('Select Options', 'Please select size and color before adding to cart.');
      return;
    }
    try {
      await dispatch(addToCart()).unwrap();
      Alert.alert('Added!', 'Item has been added to your cart.');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to add to cart.');
    }
  }, [dispatch, selectedVariant]);

  const handleQuantityChange = useCallback((delta: number) => {
    dispatch(setQuantity(quantity + delta));
  }, [dispatch, quantity]);

  const handleImageScroll = useCallback((event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    dispatch(setImageIndex(idx));
  }, [dispatch]);

  // ── Loading / Error ───────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ShopColors.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Image Gallery ────────────────── */}
        <View style={styles.galleryWrap}>
          <FlatList
            ref={galleryRef}
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
            keyExtractor={(_, i) => `img-${i}`}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.galleryImage} />
            )}
          />

          {/* Overlay header */}
          <View style={styles.galleryHeader}>
            <TouchableOpacity style={styles.headerCircle} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.galleryHeaderRight}>
              <TouchableOpacity style={styles.headerCircle} onPress={() => dispatch(toggleWishlistWithPersist())}>
                <Heart
                  size={20}
                  stroke={isWishlisted ? ShopColors.badge : Colors.text.primary}
                  fill={isWishlisted ? ShopColors.badge : 'none'}
                  strokeWidth={1.75}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerCircle}>
                <Share2 size={18} stroke={Colors.text.primary} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pagination dots */}
          {product.images.length > 1 && (
            <View style={styles.dotRow}>
              {product.images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, imageIndex === i && styles.dotActive]}
                />
              ))}
            </View>
          )}

          {/* Sale badge */}
          {hasDiscount && (
            <View style={styles.galleryBadge}>
              <Text style={styles.galleryBadgeText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        {/* ── Product Info ─────────────────── */}
        <View style={styles.infoSection}>
          <Text style={styles.brandLabel}>{product.brandId}</Text>
          <Text style={styles.productName}>{product.name}</Text>

          {/* Rating */}
          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => navigation.navigate(ShoppingRouteNames.ProductReviews, { productId })}
          >
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  stroke={ShopColors.accent}
                  fill={s <= Math.round(product.rating) ? ShopColors.accent : 'none'}
                  strokeWidth={1.5}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({product.totalReviews} reviews)</Text>
            <ChevronRight size={14} stroke={Colors.text.tertiary} />
          </TouchableOpacity>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>PKR {price.toLocaleString()}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>PKR {originalPrice.toLocaleString()}</Text>
            )}
            {hasDiscount && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save PKR {(originalPrice - price).toLocaleString()}</Text>
              </View>
            )}
          </View>

          {/* Stock */}
          {selectedVariant && (
            <Text style={[styles.stockText, selectedVariant.stockQuantity > 0 ? styles.inStock : styles.outOfStock]}>
              {selectedVariant.stockQuantity > 0
                ? `In Stock (${selectedVariant.stockQuantity} left)`
                : 'Out of Stock'}
            </Text>
          )}
        </View>

        {/* ── Size Selector ────────────────── */}
        {availableSizes.length > 0 && (
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>Size</Text>
            <View style={styles.optionRow}>
              {availableSizes.map((size) => {
                const isActive = selectedSize === size;
                const variant = product.variants.find((v) => v.size === size && (selectedColor ? v.color === selectedColor : true));
                const isAvailable = variant ? variant.stockQuantity > 0 : false;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeChip,
                      isActive && styles.sizeChipActive,
                      !isAvailable && styles.sizeChipDisabled,
                    ]}
                    disabled={!isAvailable}
                    onPress={() => dispatch(setSelectedSize(size))}
                  >
                    <Text style={[
                      styles.sizeChipText,
                      isActive && styles.sizeChipTextActive,
                      !isAvailable && styles.sizeChipTextDisabled,
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Color Picker ─────────────────── */}
        {availableColors.length > 0 && (
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>
              Color{selectedColor ? `: ${selectedColor}` : ''}
            </Text>
            <View style={styles.optionRow}>
              {availableColors.map(({ name, code }) => {
                const isActive = selectedColor === name;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: code },
                      code === '#FFFFFF' && styles.colorSwatchWhite,
                      isActive && { borderColor: ShopColors.primary, borderWidth: 3 },
                    ]}
                    onPress={() => dispatch(setSelectedColor(name))}
                  >
                    {isActive && (
                      <View style={styles.colorCheck}>
                        <Text style={{ color: code === '#FFFFFF' || code === '#F1C40F' ? '#333' : '#FFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Quantity Selector ────────────── */}
        <View style={styles.optionSection}>
          <Text style={styles.optionTitle}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={[styles.quantityBtn, quantity <= 1 && styles.quantityBtnDisabled]}
              disabled={quantity <= 1}
              onPress={() => handleQuantityChange(-1)}
            >
              <Minus size={16} stroke={quantity <= 1 ? Colors.text.tertiary : Colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => handleQuantityChange(1)}
            >
              <Plus size={16} stroke={Colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ─────────────────────────── */}
        <View style={styles.tabRow}>
          {(['description', 'sizeGuide', 'reviews'] as const).map((tab) => {
            const labels = { description: 'Description', sizeGuide: 'Size Guide', reviews: 'Reviews' };
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => dispatch(setActiveTab(tab))}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'description' && (
            <Text style={styles.descriptionText}>{product.description}</Text>
          )}

          {activeTab === 'sizeGuide' && (
            <View style={styles.sizeGuide}>
              <Text style={styles.sizeGuideTitle}>Size Guide</Text>
              <View style={styles.sizeGuideRow}>
                <Text style={styles.sizeGuideHeader}>Size</Text>
                <Text style={styles.sizeGuideHeader}>Chest (in)</Text>
                <Text style={styles.sizeGuideHeader}>Waist (in)</Text>
              </View>
              {[
                { size: 'S', chest: '34-36', waist: '28-30' },
                { size: 'M', chest: '38-40', waist: '32-34' },
                { size: 'L', chest: '42-44', waist: '36-38' },
                { size: 'XL', chest: '46-48', waist: '40-42' },
              ].map((row) => (
                <View key={row.size} style={styles.sizeGuideRow}>
                  <Text style={styles.sizeGuideCell}>{row.size}</Text>
                  <Text style={styles.sizeGuideCell}>{row.chest}</Text>
                  <Text style={styles.sizeGuideCell}>{row.waist}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {reviews.length === 0 ? (
                <Text style={styles.noReviewsText}>No reviews yet</Text>
              ) : (
                <>
                  {reviews.slice(0, 3).map((review) => (
                    <View key={review.reviewId} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewUserRow}>
                          {review.userAvatar ? (
                            <Image source={{ uri: review.userAvatar }} style={styles.reviewAvatar} />
                          ) : (
                            <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}>
                              <Text style={styles.reviewAvatarText}>
                                {review.userName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View>
                            <Text style={styles.reviewUserName}>{review.userName}</Text>
                            <View style={styles.reviewStars}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={11}
                                  stroke={ShopColors.accent}
                                  fill={s <= review.rating ? ShopColors.accent : 'none'}
                                  strokeWidth={1.5}
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.reviewComment} numberOfLines={3}>{review.comment}</Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.seeAllReviews}
                    onPress={() => navigation.navigate(ShoppingRouteNames.ProductReviews, { productId })}
                  >
                    <Text style={styles.seeAllReviewsText}>See all {product.totalReviews} reviews</Text>
                    <ChevronRight size={16} stroke={ShopColors.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bottom Bar ─────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceWrap}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPrice}>PKR {(price * quantity).toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            (!selectedVariant || selectedVariant.stockQuantity === 0) && styles.addToCartBtnDisabled,
          ]}
          disabled={!selectedVariant || selectedVariant.stockQuantity === 0 || addToCartLoading}
          onPress={handleAddToCart}
        >
          {addToCartLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <ShoppingCart size={18} stroke="#FFF" strokeWidth={2} />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  },

  // Gallery
  galleryWrap: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.backgroundAlt,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
  },
  galleryHeader: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 0) + 20,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryHeaderRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  dotRow: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 20,
  },
  galleryBadge: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    backgroundColor: ShopColors.badge,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  galleryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Info
  infoSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  brandLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ShopColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
    lineHeight: 26,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: ShopColors.primary,
  },
  originalPrice: {
    fontSize: 16,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  saveBadge: {
    backgroundColor: ShopColors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: ShopColors.primary,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
  inStock: {
    color: ShopColors.success,
  },
  outOfStock: {
    color: ShopColors.badge,
  },

  // Options
  optionSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    marginTop: Spacing.xs,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // Size chips
  sizeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sizeChipActive: {
    backgroundColor: ShopColors.primary,
    borderColor: ShopColors.primary,
  },
  sizeChipDisabled: {
    backgroundColor: Colors.backgroundAlt,
    borderColor: Colors.borderLight,
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  sizeChipTextActive: {
    color: '#FFF',
  },
  sizeChipTextDisabled: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },

  // Color swatches
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchWhite: {
    borderColor: Colors.borderDark,
  },
  colorCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quantity
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnDisabled: {
    backgroundColor: Colors.backgroundAlt,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginTop: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: ShopColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: ShopColors.primary,
    fontWeight: '600',
  },
  tabContent: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    minHeight: 120,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },

  // Size Guide
  sizeGuide: {},
  sizeGuideTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  sizeGuideRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sizeGuideHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sizeGuideCell: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
  },

  // Reviews
  noReviewsText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  reviewCard: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewAvatarPlaceholder: {
    backgroundColor: ShopColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: ShopColors.primary,
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    marginTop: Spacing.sm,
  },
  seeAllReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  seeAllReviewsText: {
    fontSize: 14,
    fontWeight: '600',
    color: ShopColors.primary,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.lg,
    ...Shadows.medium,
  },
  bottomPriceWrap: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ShopColors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    flex: 1.5,
  },
  addToCartBtnDisabled: {
    backgroundColor: Colors.borderDark,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProductDetailScreen;
