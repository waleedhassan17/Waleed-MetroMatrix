import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { HC } from '../../../constants/HealthcareTheme';

interface HCSkeletonProps {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmering placeholder box used for loading states. */
const HCSkeleton: React.FC<HCSkeletonProps> = ({ width, height, radius = 10, style }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: HC.divider, opacity },
        style,
      ]}
    />
  );
};

export default HCSkeleton;
