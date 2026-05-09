import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import type { Product } from '../../types/shopping';
import SaleBadge from './SaleBadge';
import PriceDisplay from './PriceDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

const ShopColors = {
  primary: '#E67E22',
  accent: '#F39C12',
  badge: '#E74C3C',
  newBadge: '#3498DB',
};

interface ProductCardProps {
  product: Product;
  onPress: (productId: string, brandId: string) => void;
  onWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
  width?: number;
  style?: ViewStyle;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onWishlist,
  isWishlisted = false,
  width = CARD_WIDTH,
  style,
}) => {
  const hasDiscount = !!product.salePrice && product.salePrice < product.basePrice;
  const imageHeight = width * 1.15;

  return (
    <TouchableOpacity
      style={[styles.card, { width }, style]}
      activeOpacity={0.7}
      onPress={() => onPress(product.productId, product.brandId)}
    >
      {/* Image */}
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        <Image
          source={{ uri: product.images[0] }}
          style={styles.image}
        />

        {/* Badges */}
        <View style={styles.badgeColumn}>
          {hasDiscount && (
            <SaleBadge basePrice={product.basePrice} salePrice={product.salePrice!} />
          )}
          {product.isNewArrival && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Wishlist */}
        {onWishlist && (
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => onWishlist(product.productId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={16}
              stroke={isWishlisted ? ShopColors.badge : Colors.text.tertiary}
              fill={isWishlisted ? ShopColors.badge : 'none'}
              strokeWidth={1.75}
            />
          </TouchableOpacity>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Star size={11} stroke={ShopColors.accent} fill={ShopColors.accent} strokeWidth={1.5} />
          <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({product.totalReviews})</Text>
        </View>

        {/* Price */}
        <PriceDisplay
          basePrice={product.basePrice}
          salePrice={product.salePrice}
          size="sm"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  imageWrap: {
    width: '100%',
    backgroundColor: Colors.backgroundAlt,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeColumn: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    gap: 4,
  },
  newBadge: {
    backgroundColor: ShopColors.newBadge,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  newBadgeText: {
    color: '#FFF',
    fontSize: 9,
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
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oosText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  info: {
    padding: Spacing.sm,
  },
  name: {
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
});

export default React.memo(ProductCard);
