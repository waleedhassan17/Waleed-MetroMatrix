import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/Colors';
import type { BrandConfig } from '../../types/shopping';

interface BrandCardProps {
  brand: BrandConfig;
  onPress: (brandId: string) => void;
  width?: number;
  style?: ViewStyle;
}

const BrandCard: React.FC<BrandCardProps> = ({ brand, onPress, width, style }) => {
  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : {}, style]}
      activeOpacity={0.7}
      onPress={() => onPress(brand.brandId)}
    >
      {/* Banner */}
      <View style={styles.bannerWrap}>
        <Image source={{ uri: brand.bannerImage }} style={styles.banner} />
        {/* Color strip */}
        <View style={[styles.colorStrip, { backgroundColor: brand.primaryColor }]} />
      </View>

      {/* Logo + Info */}
      <View style={styles.body}>
        <View style={styles.logoWrap}>
          <Image source={{ uri: brand.logo }} style={styles.logo} />
        </View>
        <Text style={styles.name} numberOfLines={1}>{brand.name}</Text>
        <Text style={styles.tagline} numberOfLines={1}>{brand.tagline}</Text>
        <View style={styles.categoryRow}>
          {brand.categories.slice(0, 3).map((cat) => (
            <View key={cat} style={[styles.categoryTag, { backgroundColor: brand.primaryColor + '15' }]}>
              <Text style={[styles.categoryTagText, { color: brand.primaryColor }]}>{cat}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  bannerWrap: {
    height: 90,
    backgroundColor: Colors.backgroundAlt,
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  colorStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  body: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    marginTop: -36,
    borderWidth: 2,
    borderColor: Colors.surface,
    overflow: 'hidden',
    ...Shadows.small,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 6,
  },
  tagline: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '600',
  },
});

export default React.memo(BrandCard);
