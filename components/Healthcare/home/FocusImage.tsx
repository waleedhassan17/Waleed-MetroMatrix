// FocusImage — a photo that fills its box like `cover`, cropped around a
// chosen point instead of the centre. React Native's Image has no focal point
// (and the web build crops differently from the phones), so the cover size and
// offset are computed from the box's measured size and the photo's aspect:
// the same subject shows on every platform and every card shape.

import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { HC_HOME } from '../../../constants/HealthcareTheme';

export interface PhotoFocus {
  /** Width / height of the photo file. */
  aspect: number;
  /** 0 = left edge, 1 = right edge. */
  x: number;
  /** 0 = top edge, 1 = bottom edge. */
  y: number;
}

/** The cover rectangle for a box, with `focus` kept as near the middle as the photo allows. */
export const coverRect = (box: { width: number; height: number }, focus: PhotoFocus) => {
  const { width: W, height: H } = box;
  const wide = focus.aspect >= W / H;
  const width = wide ? H * focus.aspect : W;
  const height = wide ? H : W / focus.aspect;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return {
    width,
    height,
    left: clamp(W / 2 - focus.x * width, W - width),
    top: clamp(H / 2 - focus.y * height, H - height),
  };
};

const FocusImage: React.FC<{ source: ImageSourcePropType; focus: PhotoFocus }> = ({ source, focus }) => {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!box || box.width !== width || box.height !== height) setBox({ width, height });
  };
  return (
    <View style={styles.box} onLayout={onLayout}>
      {box && box.width > 0 && box.height > 0 ? (
        <Image source={source} style={[styles.image, coverRect(box, focus)]} resizeMode="cover" fadeDuration={HC_HOME.imageFade} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  image: { position: 'absolute' },
});

export default FocusImage;
