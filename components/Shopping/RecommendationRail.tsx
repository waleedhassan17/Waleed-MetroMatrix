// ============================================================================
// A titled, horizontal row of product cards, each with the reason it is there
// ("Because you liked …", "Bought together"). Renders nothing when empty, so a
// screen can always mount it and let the data decide.
// ============================================================================

import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TextStyle, View } from 'react-native';

import ProductCard from './ProductCard';
import { S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { useProductGridSizing } from '../../hooks/useProductGridSizing';
import type { ProductPick } from '../../networks/recommendations/recommendationsApi';

interface Props {
  title: string;
  subtitle?: string;
  picks: ProductPick[];
  onPressProduct: (productId: string, brandId: string) => void;
  onWishlist?: (productId: string) => void;
  wishlistIds?: Set<string>;
  /** Hide the per-card reason line (e.g. when every reason would read the same). */
  hideReasons?: boolean;
  /** The host screen's own section-heading styles, so the rail matches its neighbours. */
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  testID?: string;
}

export default function RecommendationRail({
  title,
  subtitle,
  picks,
  onPressProduct,
  onWishlist,
  wishlistIds,
  hideReasons,
  titleStyle,
  subtitleStyle,
  testID,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { cardWidth, imageHeight } = useProductGridSizing();

  if (!picks.length) return null;

  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.header}>
        <Text style={[styles.title, titleStyle]} accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
      </View>
      <FlatList
        data={picks}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.product.productId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <ProductCard
              product={{
                productId: item.product.productId,
                brandId: item.product.brandId,
                name: item.product.name,
                image: item.product.images?.[0],
                basePrice: item.product.basePrice,
                salePrice: item.product.salePrice,
                rating: item.product.rating,
                totalReviews: item.product.totalReviews,
                inStock: item.product.inStock,
                isNewArrival: item.product.isNewArrival,
              }}
              width={cardWidth}
              imageHeight={imageHeight}
              onPress={onPressProduct}
              onWishlist={onWishlist ? () => onWishlist(item.product.productId) : undefined}
              isWishlisted={wishlistIds?.has(item.product.productId)}
            />
            {!hideReasons && !!item.reason && (
              <Text style={styles.reason} numberOfLines={1}>
                {item.reason}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { marginTop: S.xl },
    header: { paddingHorizontal: S.lg, marginBottom: S.md },
    title: { ...T.heading, color: c.ink },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    list: { paddingHorizontal: S.lg },
    gap: { width: S.md },
    reason: { ...T.caption, color: c.inkMuted, marginTop: S.xs },
  });
