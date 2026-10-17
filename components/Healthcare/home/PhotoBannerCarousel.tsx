// PhotoBannerCarousel — staff promotions, one photo card at a time.
// A photo under a legibility scrim with a headline, a line under it and the
// call to action. Advances every 6 s, but never under reduced motion or while
// a screen reader runs; a touch holds it until the finger lifts; page dots
// under it. It brings its own side gutter, so it runs edge to edge.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC_HOME, HC_ON_BLUE, HC_TYPE, HCRadius, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useCalmMotion } from '../../../hooks/useCalmMotion';
import type { HealthcareBanner } from '../../../models/healthcare/types';
import { useTheme } from '../../../theme';
import PhotoScrim from './PhotoScrim';

export interface PhotoBannerCarouselProps {
  banners: HealthcareBanner[];
  onOpen: (banner: HealthcareBanner) => void;
  /** The words on each banner's button (null: none). */
  cta: (banner: HealthcareBanner) => string | null;
}

const MAX_WIDTH = 640;

const PhotoBannerCarousel: React.FC<PhotoBannerCarouselProps> = ({ banners, onOpen, cta }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const calm = useCalmMotion();
  const cardWidth = Math.min(width, MAX_WIDTH) - HCSpace.xl * 2;
  const pitch = cardWidth + HCSpace.md;

  useEffect(() => {
    if (held || calm || banners.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % banners.length;
        ref.current?.scrollTo({ x: next * pitch, animated: true });
        return next;
      });
    }, HC_HOME.bannerInterval);
    return () => clearInterval(t);
  }, [held, calm, banners.length, pitch]);

  if (!banners.length) return null;
  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={pitch}
        decelerationRate="fast"
        contentContainerStyle={styles.rail}
        onTouchStart={() => setHeld(true)}
        onTouchEnd={() => setHeld(false)}
        onScrollBeginDrag={() => setHeld(true)}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.max(0, Math.min(banners.length - 1, Math.round(e.nativeEvent.contentOffset.x / pitch))));
          setHeld(false);
        }}
      >
        {banners.map((b) => {
          const action = cta(b);
          return (
            <Pressable
              key={b.bannerId}
              onPress={() => onOpen(b)}
              accessibilityRole="button"
              accessibilityLabel={[b.title, b.subtitle, action].filter(Boolean).join('. ')}
              style={[styles.card, { width: cardWidth, aspectRatio: HC_HOME.bannerAspect }]}
            >
              <Image source={{ uri: b.image }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={HC_HOME.imageFade} />
              <PhotoScrim />
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={2}>
                  {b.title}
                </Text>
                {b.subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {b.subtitle}
                  </Text>
                ) : null}
                {action ? (
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>{action}</Text>
                    <Ionicons name="arrow-forward" size={HCSpace.lg} color={HC_ON_BLUE.spotlight} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {banners.map((b, i) => (
            <View key={b.bannerId} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    rail: { paddingHorizontal: HCSpace.xl, gap: HCSpace.md },
    card: { borderRadius: HCRadius.lg, overflow: 'hidden', backgroundColor: HC.cardAlt },
    text: { position: 'absolute', left: HCSpace.xl, right: HCSpace.xl, bottom: HCSpace.lg, gap: HCSpace.xs },
    title: { ...HC_TYPE.bannerTitle, color: HC_ON_BLUE.ink },
    subtitle: { ...HC_TYPE.small, color: HC_ON_BLUE.soft },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: HCSpace.xs,
      marginTop: HCSpace.sm,
      paddingHorizontal: HCSpace.md,
      paddingVertical: HCSpace.xs,
      borderRadius: HCRadius.pill,
      backgroundColor: HC_ON_BLUE.ink,
    },
    ctaText: { ...HC_TYPE.chip, color: HC_ON_BLUE.spotlight },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: HCSpace.xs, paddingTop: HCSpace.sm },
    dot: { width: HC_HOME.pageDot, height: HC_HOME.pageDot, borderRadius: HCRadius.pill, backgroundColor: HC.border },
    dotActive: { width: HC_HOME.pageDotActive, backgroundColor: HC.primary },
  });

export default PhotoBannerCarousel;
