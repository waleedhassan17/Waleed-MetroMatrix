// ============================================
// Shopping Module - Promo Banner Carousel
//
// One carousel for both the brand chooser and a brand's storefront. Pulled out
// of those two screens because each kept its own copy, and both copies had the
// same three faults:
//
//   1. The paging index lived in the SCREEN's state. On the brand list the
//      strip is inside `ListHeaderComponent`, so every index change re-rendered
//      the list, remounted the header, and snapped the strip back to the first
//      banner. Holding the index here means a swipe re-renders this component
//      and nothing above it.
//   2. `pagingEnabled` and `snapToInterval` were both set. Paging steps by the
//      full viewport width, the interval by the card width — on every screen
//      where a banner is narrower than the viewport the two disagree.
//   3. The auto-scroll called `scrollToIndex` with no `getItemLayout`, which
//      throws on an item the virtualiser has not measured yet.
// ============================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewStyle,
} from 'react-native';
import { Spacing, BorderRadius, makeColors, type ColorType } from '../../constants/Colors';
import { ThemeColors, useTheme } from '../../theme';

export interface BannerCarouselItem {
  bannerId: string;
  image: string;
  title: string;
  subtitle?: string;
  brandId?: string | null;
  productId?: string | null;
}

interface BannerCarouselProps {
  banners: BannerCarouselItem[];
  /** Width of a single banner card. The gap is added on top of it. */
  itemWidth: number;
  itemHeight?: number;
  /** Space between cards, and the inset before the first / after the last. */
  gap?: number;
  edgeInset?: number;
  /** Advances on a timer until the shopper touches the strip. */
  autoScroll?: boolean;
  autoScrollInterval?: number;
  onPressBanner?: (banner: BannerCarouselItem) => void;
  style?: ViewStyle;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners,
  itemWidth,
  itemHeight = 160,
  gap = Spacing.md,
  edgeInset = Spacing.lg,
  autoScroll = false,
  autoScrollInterval = 4000,
  onPressBanner,
  style,
}) => {
  const { colors, mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(Colors, colors), [Colors, colors]);

  const listRef = useRef<FlatList<BannerCarouselItem>>(null);
  const [index, setIndex] = useState(0);
  // Once the shopper drives the strip themselves the timer stops for good —
  // an advance mid-swipe is worse than no advance at all.
  const [handledOver, setHandledOver] = useState(false);

  const stride = itemWidth + gap;

  // A shrinking list (entering a storefront filters the banners down) must not
  // leave the dots pointing past the end.
  useEffect(() => {
    setIndex((prev) => (prev >= banners.length ? 0 : prev));
  }, [banners.length]);

  useEffect(() => {
    if (!autoScroll || handledOver || banners.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % banners.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [autoScroll, handledOver, banners.length, autoScrollInterval]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / stride);
      setIndex(Math.max(0, Math.min(next, banners.length - 1)));
    },
    [stride, banners.length]
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: itemWidth, offset: i * stride, index: i }),
    [itemWidth, stride]
  );

  const renderItem = useCallback(
    ({ item }: { item: BannerCarouselItem }) => (
      <TouchableOpacity
        style={[styles.card, { width: itemWidth, height: itemHeight }]}
        activeOpacity={0.9}
        disabled={!onPressBanner}
        onPress={() => onPressBanner?.(item)}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.overlay}>
          <Text style={styles.title}>{item.title}</Text>
          {!!item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
        </View>
      </TouchableOpacity>
    ),
    [styles, itemWidth, itemHeight, onPressBanner]
  );

  if (banners.length === 0) return null;

  return (
    <View style={style}>
      <FlatList
        ref={listRef}
        data={banners}
        renderItem={renderItem}
        keyExtractor={(item) => item.bannerId}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={stride}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={({ index: target }) =>
          listRef.current?.scrollToOffset({ offset: target * stride, animated: true })
        }
        contentContainerStyle={{ paddingHorizontal: edgeInset }}
        ItemSeparatorComponent={() => <View style={{ width: gap }} />}
        onScrollBeginDrag={() => setHandledOver(true)}
        onMomentumScrollEnd={handleMomentumEnd}
      />

      {banners.length > 1 && (
        <View style={styles.dotsRow}>
          {banners.map((banner, i) => (
            <View
              key={banner.bannerId}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const makeStyles = (Colors: ColorType, c: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      backgroundColor: Colors.backgroundAlt,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
      padding: Spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
    },
    subtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Spacing.sm,
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.line,
    },
    dotActive: {
      width: 20,
      backgroundColor: c.accent,
      borderRadius: 3,
    },
  });

export default React.memo(BannerCarousel);
