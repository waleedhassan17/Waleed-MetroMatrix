import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { C, R } from '../../constants/theme';
import { initialsOf } from '../../utils/homeservice/format';

/**
 * A person's avatar, with a fallback that is not a broken image box.
 *
 * The bookings serializer sends `providerAvatar` as an empty string when the
 * provider has no photo, and remote URLs 404. Both used to render the grey
 * broken-image placeholder, which is why the list looked unfinished.
 */
export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Ground behind the initials. Defaults to the sunken neutral. */
  tint?: string;
  /** Initials colour. Defaults to muted ink. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, tint, color, style }) => {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const initials = initialsOf(name);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, dimension, style as StyleProp<ImageStyle>]}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.fallback,
        dimension,
        { backgroundColor: tint ?? C.surfaceSunken },
        style,
      ]}
      accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}
    >
      {initials ? (
        <Text
          style={{
            fontSize: Math.round(size * 0.36),
            fontWeight: '600',
            color: color ?? C.inkMuted,
          }}
        >
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={Math.round(size * 0.5)} color={color ?? C.inkFaint} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.surfaceSunken,
    borderRadius: R.pill,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Avatar;
