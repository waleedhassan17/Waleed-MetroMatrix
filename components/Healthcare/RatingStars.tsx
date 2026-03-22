import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/Colors';
import { Typography } from '../../constants/Fonts';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  totalReviews?: number;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 14,
  showValue = true,
  totalReviews,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={i < Math.round(rating) ? Colors.accent : Colors.text.tertiary}
        />
      ))}
      {showValue && <Text style={styles.value}>{rating.toFixed(1)}</Text>}
      {totalReviews !== undefined && (
        <Text style={styles.count}>({totalReviews})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  value: {
    ...Typography.label.medium,
    color: Colors.accent,
    marginLeft: Spacing.xs,
  },
  count: {
    ...Typography.caption.medium,
    color: Colors.text.tertiary,
  },
});

export default RatingStars;
