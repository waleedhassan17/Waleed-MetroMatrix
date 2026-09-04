// ============================================================================
// Onboarding
//
// Four slides on the ink ground, each previewing one real part of the product.
// The hero is a card showing a fragment of that module's actual UI — a booking
// row, an appointment, an order — rather than an icon standing in for it. A
// picture of the thing beats a symbol for the thing.
//
// WHY THERE IS NO ENTRANCE ANIMATION
// ----------------------------------
// The only moving element is the page indicator, and it moves because the
// user's finger moves. The previous version reset seven Animated.Values on
// every index change and staggered them with four uncleaned setTimeouts —
// including a -180deg spin — which meant a fast swipe left text mid-fade and
// offscreen slides animated along with the visible one. Content that settles
// reads as considered; content that performs reads as a template.
//
// WHY IT IS DARK
// --------------
// `C.ink` is the app's own near-black, and `MODULE_PALETTES.neutral` already
// names ink as the colour of the app before any vertical claims it. Splash and
// onboarding share it, so the one transition into the light product happens
// once, on "Get started", rather than flickering mid-flow. Every value painted
// on it is derived through `tint()` from an existing token — see D below.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  setOnboardingStatus,
  setSelectedRole,
} from '../../../components/app-container/appContainerSlice';
import Screen from '../../../components/ui/Screen';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import useReducedMotion from '../../../hooks/useReducedMotion';
import { C, GUTTER, MODULE_PALETTES, PROSE_WIDTH, R, S, T, tint } from '../../../theme';
import { setOnboardingComplete } from '../../../utils/storage_utils/storageUtils';

// ── The dark ground ─────────────────────────────────────────────────────────
//
// `tint` returns an 8-digit hex, so an ink screen needs no palette of its own:
// every surface here is `C.inkInverse` or `C.ink` at an alpha. Text alphas are
// floored at 0.56 (5.8:1 on ink, past AA body) — 0.40 is used for the inactive
// dots, which carry no text.

const D = {
  cardFill: tint(C.inkInverse, 0.04),
  wellFill: tint(C.inkInverse, 0.03),
  hairline: tint(C.inkInverse, 0.08),
  hairlineSoft: tint(C.inkInverse, 0.06),
  textBody: tint(C.inkInverse, 0.72),
  textMuted: tint(C.inkInverse, 0.56),
  dotIdle: tint(C.inkInverse, 0.18),
  badgeFill: tint(C.ink, 0.9),
} as const;

const HS = MODULE_PALETTES.homeservice.accent;
const HC = MODULE_PALETTES.healthcare.accent;
const SH = MODULE_PALETTES.shopping.accent;

// ── Slide data ──────────────────────────────────────────────────────────────

type Glyph = React.ComponentProps<typeof Ionicons>['name'];

interface CardRow {
  /** Leading icon. Mutually exclusive with `dot`. */
  icon?: Glyph;
  /** Leading module dot, for the services overview. */
  dot?: string;
  primary: string;
  secondary?: string;
  trailing?: string;
  trailingIcon?: Glyph;
  /** Hairline above this row — separates a total or a status line. */
  rule?: boolean;
}

interface Slide {
  key: string;
  /** Drives the eyebrow dot, the title's second line and the page indicator. */
  accent: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  card: { title: string; chip: string; rows: CardRow[] };
  badges: [{ value: string; label: string }, { value: string; label: string }];
}

const SLIDES: Slide[] = [
  {
    key: 'overview',
    // Nothing has claimed the app yet, so the overview slide stays monochrome
    // and the colour arrives with the verticals.
    accent: C.inkInverse,
    eyebrow: 'MetroMatrix',
    title: 'Your city,',
    titleAccent: 'one app.',
    subtitle:
      'Home services, healthcare and shopping — booked, tracked and paid for in a single place.',
    card: {
      title: 'Services',
      chip: 'All in one',
      rows: [
        { dot: HS, primary: 'Home services', trailing: 'Book a pro' },
        { dot: HC, primary: 'Healthcare', trailing: 'Consult a doctor' },
        { dot: SH, primary: 'Shopping', trailing: 'Order essentials' },
      ],
    },
    badges: [
      { value: '3', label: 'Services' },
      { value: '1', label: 'Account' },
    ],
  },
  {
    key: 'homeservice',
    accent: HS,
    eyebrow: 'Home services',
    title: 'Verified pros,',
    titleAccent: 'booked in minutes.',
    subtitle:
      'Compare rated professionals, pick a slot, and follow them to your door.',
    card: {
      title: 'Booking',
      chip: 'Confirmed',
      rows: [
        {
          icon: 'construct-outline',
          primary: 'Ahsan Electricals',
          secondary: 'Electrician · 2.4 km',
          trailing: '4.9',
          trailingIcon: 'star',
        },
        {
          icon: 'time-outline',
          primary: 'Arriving today',
          secondary: '4:30 PM — 5:00 PM',
          rule: true,
        },
      ],
    },
    badges: [
      { value: '4.8', label: 'Avg rating' },
      { value: 'Live', label: 'Tracking' },
    ],
  },
  {
    key: 'healthcare',
    accent: HC,
    eyebrow: 'Healthcare',
    title: 'Care, without',
    titleAccent: 'the waiting room.',
    subtitle:
      'Consult verified doctors, book appointments, and keep your records in one place.',
    card: {
      title: 'Appointment',
      chip: 'Verified',
      rows: [
        {
          icon: 'medkit-outline',
          primary: 'Dr. Ayesha Khan',
          secondary: 'Cardiologist',
          trailing: '4.8',
          trailingIcon: 'star',
        },
        {
          icon: 'videocam-outline',
          primary: 'Video consult',
          secondary: 'Today, 6:00 PM',
          rule: true,
        },
      ],
    },
    badges: [
      { value: '24/7', label: 'Consults' },
      { value: 'Secure', label: 'Records' },
    ],
  },
  {
    key: 'shopping',
    accent: SH,
    eyebrow: 'Shopping',
    title: 'Trusted brands,',
    titleAccent: 'secure checkout.',
    subtitle:
      'Shop verified sellers and pay securely, with every order tracked to delivery.',
    card: {
      title: 'Order',
      chip: 'Paid',
      rows: [
        { icon: 'headset-outline', primary: 'Wireless earbuds', trailing: 'Rs 4,200' },
        { icon: 'shirt-outline', primary: 'Cotton kurta', trailing: 'Rs 2,800' },
        { icon: 'card-outline', primary: 'Total', trailing: 'Rs 7,000', rule: true },
      ],
    },
    badges: [
      { value: 'Secure', label: 'Checkout' },
      { value: 'Free', label: 'Returns' },
    ],
  },
];

// ── Page indicator geometry ─────────────────────────────────────────────────
//
// A fixed-geometry pill that only ever translates. Stretching a pill with
// scaleX turns it into an ellipse — the radius resolves in layout space and is
// then scaled with everything else, so it cannot be corrected afterwards.

const DOT = 8;
const PITCH = 16;
const WORM = 24;
const TRACK = WORM + PITCH * (SLIDES.length - 1);

// ============================================================================

const Onboarding: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Slide>>(null);

  const isLast = index === SLIDES.length - 1;

  // Built once per width. Rebuilding these inside renderItem would tear down
  // and recreate the native animation graph on every index change.
  const fades = useMemo(
    () =>
      SLIDES.map((_, i) =>
        scrollX.interpolate({
          inputRange: [(i - 1) * width, i * width, (i + 1) * width],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        }),
      ),
    [scrollX, width],
  );

  const wormX = useMemo(
    () =>
      scrollX.interpolate({
        inputRange: [0, (SLIDES.length - 1) * width],
        outputRange: [0, (SLIDES.length - 1) * PITCH],
        extrapolate: 'clamp',
      }),
    [scrollX, width],
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

  // One re-render per settled page. `onViewableItemsChanged` reports two items
  // mid-swipe at a 50% threshold and its first entry is not reliably the
  // incoming one, which is why the label used to lag the slide.
  const onSettle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex((prev) => (prev === next ? prev : next));
    },
    [width],
  );

  /** Persist first, then leave. Called by both "Get started" and Skip. */
  const finish = useCallback(async () => {
    await setOnboardingComplete(true);
    dispatch(setOnboardingStatus(true));
    navigation.replace('RoleSelection');
  }, [dispatch, navigation]);

  const onPrimary = useCallback(() => {
    if (isLast) {
      void finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: !reduced });
  }, [finish, index, isLast, reduced]);

  // "I already have an account" is the customer path — providers reach their
  // sign-in through RoleSelection. Setting the role here keeps the launch gate
  // consistent: SignIn does not set it, so without this a returning user lands
  // back on RoleSelection.
  const onSignIn = useCallback(async () => {
    await setOnboardingComplete(true);
    dispatch(setOnboardingStatus(true));
    dispatch(setSelectedRole('user'));
    navigation.replace('SignIn');
  }, [dispatch, navigation]);

  const renderSlide = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[s.slide, { width }]}>
        {/* Ambient accent, well under the card. Two circles, not a gradient —
            a gradient at this opacity bands on Android. */}
        <View
          style={[
            s.glowOuter,
            {
              width: width * 0.86,
              height: width * 0.86,
              borderRadius: width * 0.43,
              backgroundColor: tint(item.accent, 0.05),
            },
          ]}
        />
        <View
          style={[
            s.glowInner,
            {
              width: width * 0.58,
              height: width * 0.58,
              borderRadius: width * 0.29,
              backgroundColor: tint(item.accent, 0.05),
            },
          ]}
        />

        <View style={s.slideBody}>
          <PreviewCard slide={item} />

          <View style={s.eyebrow}>
            <View style={[s.eyebrowDot, { backgroundColor: item.accent }]} />
            <Text style={s.eyebrowText}>{item.eyebrow}</Text>
          </View>

          <Text style={s.title}>
            {item.title}
            {'\n'}
            <Text style={{ color: item.accent }}>{item.titleAccent}</Text>
          </Text>

          <Text style={s.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    ),
    [width],
  );

  return (
    <Screen background={C.ink} barStyle="light-content" edges={['top', 'bottom']}>
      <Animated.FlatList
        ref={listRef as any}
        style={s.list}
        data={SLIDES}
        renderItem={renderSlide as any}
        keyExtractor={(item: unknown) => (item as Slide).key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_: unknown, i: number) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onScroll={onScroll}
        onMomentumScrollEnd={onSettle}
        onScrollEndDrag={onSettle}
      />

      <View style={s.footer}>
        {/* Indicator. Idle dots sit still; one pill slides across them. Each
            slide owns a pill in its own accent, cross-faded by opacity — an
            RGB interpolation between two saturated accents passes through a
            muddy midpoint, an alpha cross-fade does not. */}
        <View
          style={s.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((slide, i) => (
            <View key={`dot-${slide.key}`} style={[s.dot, { left: (WORM - DOT) / 2 + i * PITCH }]} />
          ))}
          {SLIDES.map((slide, i) =>
            reduced ? (
              index === i ? (
                <View
                  key={`worm-${slide.key}`}
                  style={[s.worm, { left: i * PITCH, backgroundColor: slide.accent }]}
                />
              ) : null
            ) : (
              <Animated.View
                key={`worm-${slide.key}`}
                style={[
                  s.worm,
                  {
                    backgroundColor: slide.accent,
                    opacity: fades[i],
                    transform: [{ translateX: wormX }],
                  },
                ]}
              />
            ),
          )}
        </View>

        <TouchableOpacity
          style={s.cta}
          onPress={onPrimary}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Continue to the next slide'}
        >
          <Text style={s.ctaText}>{isLast ? 'Get started' : 'Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSignIn}
          style={s.link}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="I already have an account. Sign in"
        >
          <Text style={s.linkText}>
            I already have an account
            <Text style={s.linkStrong}>{'  Sign in'}</Text>
          </Text>
        </TouchableOpacity>

        {/* Reserved height so the row below the CTA never changes size — a
            skip link that appears and disappears must not move the button. */}
        <View style={s.skipSlot}>
          {index === 0 && (
            <TouchableOpacity
              onPress={() => void finish()}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text style={s.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Screen>
  );
};

// ── Preview card ────────────────────────────────────────────────────────────

const PreviewCard: React.FC<{ slide: Slide }> = ({ slide }) => {
  const { accent, card, badges } = slide;

  return (
    <View style={s.cardWrap}>
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>{card.title}</Text>
          <View style={[s.cardChip, { backgroundColor: tint(accent, 0.18) }]}>
            <Text style={s.cardChipText}>{card.chip}</Text>
          </View>
        </View>

        {card.rows.map((row, i) => (
          <View key={`${card.title}-${i}`} style={[s.row, row.rule && s.rowRuled]}>
            {row.dot ? (
              <View style={s.rowLead}>
                <View style={[s.rowDot, { backgroundColor: row.dot }]} />
              </View>
            ) : (
              <View style={[s.rowLead, s.rowIcon]}>
                <Ionicons name={row.icon ?? 'ellipse-outline'} size={14} color={accent} />
              </View>
            )}

            <View style={s.rowText}>
              <Text style={s.rowPrimary} numberOfLines={1}>
                {row.primary}
              </Text>
              {!!row.secondary && (
                <Text style={s.rowSecondary} numberOfLines={1}>
                  {row.secondary}
                </Text>
              )}
            </View>

            {!!row.trailing && (
              <View style={s.rowTrail}>
                {!!row.trailingIcon && (
                  <Ionicons name={row.trailingIcon} size={11} color={accent} style={s.rowTrailIcon} />
                )}
                <Text style={s.rowTrailText}>{row.trailing}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Stat pills overhanging the card. They read as data lifted out of the
          product, which is the point — the numbers are the trust cue. */}
      <View style={[s.badge, s.badgeTop, { borderColor: tint(accent, 0.35) }]}>
        <Text style={s.badgeValue}>{badges[0].value}</Text>
        <Text style={s.badgeLabel}>{badges[0].label}</Text>
      </View>
      <View style={[s.badge, s.badgeBottom, { borderColor: tint(accent, 0.35) }]}>
        <Text style={s.badgeValue}>{badges[1].value}</Text>
        <Text style={s.badgeLabel}>{badges[1].label}</Text>
      </View>
    </View>
  );
};

export default Onboarding;

// ============================================================================

const s = StyleSheet.create({
  list: { flex: 1 },
  slide: { flex: 1, justifyContent: 'center' },
  slideBody: { paddingHorizontal: S.xxxl, alignItems: 'center' },

  glowOuter: { position: 'absolute', top: '8%', left: '6%' },
  glowInner: { position: 'absolute', top: '16%', left: '20%' },

  // ── Card ──
  cardWrap: { width: '100%', maxWidth: 300, marginBottom: S.xxxl },
  card: {
    backgroundColor: D.cardFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.hairline,
    borderRadius: R.sheet,
    padding: S.lg,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.md,
  },
  cardTitle: { ...T.label, color: C.inkInverse },
  cardChip: { paddingHorizontal: S.sm, paddingVertical: 3, borderRadius: R.chip },
  cardChipText: { ...T.caption, color: C.inkInverse },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm },
  rowRuled: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: D.hairlineSoft,
    marginTop: S.xs,
    paddingTop: S.md,
  },
  rowLead: { width: 26, alignItems: 'center', justifyContent: 'center' },
  rowIcon: {
    height: 26,
    borderRadius: R.chip,
    backgroundColor: D.wellFill,
  },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, marginLeft: S.md },
  rowPrimary: { ...T.caption, color: D.textBody },
  rowSecondary: { ...T.caption, color: D.textMuted, marginTop: 1 },
  rowTrail: { flexDirection: 'row', alignItems: 'center' },
  rowTrailIcon: { marginRight: 3 },
  rowTrailText: { ...T.caption, color: C.inkInverse },

  // ── Floating stat pills ──
  badge: {
    position: 'absolute',
    backgroundColor: D.badgeFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.card,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
  },
  badgeTop: { top: -14, right: -10 },
  badgeBottom: { bottom: -14, left: -10 },
  badgeValue: { ...T.bodyStrong, color: C.inkInverse },
  badgeLabel: { ...T.caption, color: D.textMuted, marginTop: 1 },

  // ── Copy ──
  eyebrow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, marginRight: S.sm },
  eyebrowText: { ...T.label, color: D.textMuted },
  title: {
    ...T.title,
    color: C.inkInverse,
    textAlign: 'center',
    marginBottom: S.md,
  },
  subtitle: {
    ...T.body,
    color: D.textMuted,
    textAlign: 'center',
    maxWidth: PROSE_WIDTH,
  },

  // ── Footer ──
  footer: { paddingHorizontal: GUTTER, paddingTop: S.xl, alignItems: 'center' },
  track: {
    width: TRACK,
    height: DOT,
    marginBottom: S.xxl,
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: D.dotIdle,
  },
  worm: {
    position: 'absolute',
    left: 0,
    width: WORM,
    height: DOT,
    borderRadius: R.pill,
  },
  cta: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: R.control,
    backgroundColor: C.inkInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { ...T.subhead, color: C.ink },
  link: { paddingVertical: S.md },
  linkText: { ...T.body, color: D.textMuted },
  linkStrong: { ...T.bodyStrong, color: C.inkInverse },
  skipSlot: { height: 36, justifyContent: 'center' },
  skipText: { ...T.body, color: D.textMuted },
});
