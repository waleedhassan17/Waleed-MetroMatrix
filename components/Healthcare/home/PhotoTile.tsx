// PhotoTile — one of Health's own services as a small photo card (records,
// prescriptions, vitals …): the photo on top, the name under it. The
// emergency tile's name is the one red word on the page.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { HC_HOME, HC_TYPE, HCRadius, HCShadow, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';
import FocusImage, { type PhotoFocus } from './FocusImage';

const PhotoTile: React.FC<{ label: string; image: ImageSourcePropType; focus: PhotoFocus; onPress: () => void; tone?: 'danger' }> = ({
  label,
  image,
  focus,
  onPress,
  tone,
}) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <View style={styles.photo}>
        <FocusImage source={image} focus={focus} />
      </View>
      <View style={styles.label}>
        <Text style={[styles.text, tone === 'danger' && styles.danger]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: {
      width: HC_HOME.photoTileWidth,
      borderRadius: HCRadius.lg,
      backgroundColor: HC.card,
      borderWidth: 1,
      borderColor: HC.borderLight,
      ...HCShadow.xs,
    },
    pressed: { opacity: 0.85 },
    photo: {
      height: HC_HOME.photoTileImage,
      borderTopLeftRadius: HCRadius.lg,
      borderTopRightRadius: HCRadius.lg,
      overflow: 'hidden',
      backgroundColor: HC.cardAlt,
    },
    label: { paddingHorizontal: HCSpace.sm, paddingVertical: HCSpace.sm, minHeight: HC_HOME.touch, justifyContent: 'center' },
    text: { ...HC_TYPE.chip, color: HC.textDark, textAlign: 'center' },
    danger: { color: HC.errorDark },
  });

export default PhotoTile;
