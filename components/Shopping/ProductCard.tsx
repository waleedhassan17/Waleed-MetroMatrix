import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import SaleBadge from './SaleBadge';
import PriceDisplay from './PriceDisplay';

const ShopColors = {
  primary: '#E67E22',
  accent: '#F39C12',
  badge: '#E74C3C',
  newBadge: '#3498DB',
};

const FALLBACK_IMAGE = 'https://placehold.co/600x800/F1F1F1/999999?text=No+Image';

// Fixed content-area height (below the image) so two cards in the same row
// always line up, whether one title wraps to 2 lines and its neighbour to 1.
const INFO_HEIGHT = 88;

export interface ProductCardData {
  productId: string;
  brandId: string;
  brandName?: string;
  name: string;
  image?: string;
  basePrice: number;
  salePrice?: number | null;
  rating?: number;
  totalReviews?: number;
  inStock?: boolean;
  isNewArrival?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  width: number;
  imageHeight: number;
  onPress: (productId: string, brandId: string) => void;
  onWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
  style?: ViewStyle;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  width,
  imageHeight,
  onPress,
  onWishlist,
  isWishlisted = false,
  style,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasDiscount = !!product.salePrice && product.salePrice < product.basePrice;
  const inStock = product.inStock !== false;
  const rating = product.rating ?? 0;
  const totalReviews = product.totalReviews ?? 0;

  return (
    <TouchableOpacity
      style={[styles.card, { width }, style]}
      activeOpacity={0.7}
      onPress={() => onPress(product.productId, product.brandId)}
    >
      {/* Image */}
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        <Image
          source={{ uri: imageFailed || !product.image ? FALLBACK_IMAGE : product.image }}
          style={styles.image}
          onError={() => setImageFailed(true)}
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
        {!inStock && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Info — fixed height so every card in a row matches regardless of
          title length */}
      <View style={[styles.info, { height: INFO_HEIGHT }]}>
        {product.brandName ? (
          <Text style={styles.brandName} numberOfLines={1}>{product.brandName}</Text>
        ) : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <View style={styles.bottomRow}>
          <View style={styles.ratingRow}>
            <Star size={11} stroke={ShopColors.accent} fill={ShopColors.accent} strokeWidth={1.5} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({totalReviews})</Text>
          </View>
          <PriceDisplay
            basePrice={product.basePrice}
            salePrice={product.salePrice ?? undefined}
            size="sm"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ProductCardSkeleton: React.FC<{ width: number; imageHeight: number; style?: ViewStyle }> = ({
  width,
  imageHeight,
  style,
}) => (
  <View style={[styles.card, { width }, style]}>
    <View style={[styles.imageWrap, styles.skeletonBlock, { height: imageHeight }]} />
    <View style={[styles.info, { height: INFO_HEIGHT }]}>
      <View style={[styles.skeletonBlock, styles.skeletonLine]} />
      <View style={[styles.skeletonBlock, styles.skeletonLineShort]} />
      <View style={[styles.skeletonBlock, styles.skeletonPrice]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
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
    justifyContent: 'space-between',
  },
  brandName: {
    fontSize: 10,
    fontWeight: '700',
    color: ShopColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 17,
    marginTop: 2,
  },
  bottomRow: {
    marginTop: 'auto',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Skeleton
  skeletonBlock: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.xs,
  },
  skeletonLine: {
    height: 12,
    width: '90%',
    marginTop: 4,
  },
  skeletonLineShort: {
    height: 12,
    width: '60%',
    marginTop: 6,
  },
  skeletonPrice: {
    height: 14,
    width: '40%',
    marginTop: 'auto',
  },
});

export default React.memo(ProductCard);
