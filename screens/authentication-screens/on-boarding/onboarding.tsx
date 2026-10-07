// ============================================================================
// Onboarding
//
// Four slides on the app's own warm paper ground, each previewing one real part
// of the product. The hero is a card showing a fragment of that module's actual
// UI — a booking row, an appointment, an order — rather than an icon standing
// in for it. A picture of the thing beats a symbol for the thing.
//
// The card's head is that module's real page header: the same derived gradient
// AppBar paints (`headerGradientStops` of the module's `accentDeep`), so the
// green, blue and orange a user meets here are the ones waiting inside. The
// overview card wears the logo's emerald -> teal instead.
//
// The screen itself wears the `brand` palette (RouteModules), MetroMatrix's own
// emerald: the logo and wordmark in the top bar, and the one primary button,
// which stays brand on every slide — one action, one colour. Each slide's own
// colour travels in its glow, its card and the page indicator.
//
// EACH SLIDE CARRIES A WHOLE ModulePalette, NOT A HEX
// --------------------------------------------------
// The five slots are not interchangeable and using the wrong one is how an
// onboarding screen fails contrast:
//
//   accent      fills, dots, the page indicator      — never small text
//   accentDeep  accent-coloured TEXT                 — the slot that is
//                                                      guaranteed on white
//   accentSoft  the ambient wash and chip grounds
//   accentLine  hairline on a lifted stat pill
//
// Shopping orange (#E67E22) on paper is 2.7:1 — it fails even the large-text
// bar. Its `accentDeep` (#D35400) passes. That is exactly why the slot exists,
// and why no slide here holds a raw colour of its own. The same goes for the
// brand: white on the hub's `#10B981` is 2.5:1, so the button is the brand's
// `accent` (#047857, 5.5:1), not that green.
//
// WHY THERE IS NO ENTRANCE ANIMATION
// ----------------------------------
// The only moving element is the page indicator, and it moves because the
// user's finger moves. The previous version reset seven Animated.Values on
// every index change and staggered them with four uncleaned setTimeouts —
// including a -180deg spin — so a fast swipe left text mid-fade and offscreen
// slides animated along with the visible one. Content that settles reads as
// considered; content that performs reads as a template.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { setOnboardingStatus } from '../../../components/app-container/appContainerSlice';
import { AmbientGlow, BrandMark, BrandWordmark } from '../../../components/brand';
import Button from '../../../components/ui/Button';
import Screen from '../../../components/ui/Screen';
import { darkShift } from '../../../constants/darkShift';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import useReducedMotion from '../../../hooks/useReducedMotion';
import {
  BRAND_GLOW,
  BRAND_GRADIENT,
  E,
  GUTTER,
  headerGradientStops,
  MODULE_PALETTES,
  modulePalette,
  type ModuleName,
  type ThemeMode,
  type ThemeColors,
  useTheme,
  PROSE_WIDTH,
  R,
  S,
  T,
} from '../../../theme';
import { setOnboardingComplete } from '../../../utils/storage_utils/storageUtils';

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
  paletteKey: ModuleName;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  card: { title: string; chip: string; rows: CardRow[] };
  badges: [{ value: string; label: string }, { value: string; label: string }];
}

// The slides advertise the three verticals, so each carries its module's
// accent. Resolved per mode: the light `accentSoft` grounds are near-white and
// would be glare panels on the dark onboarding canvas.
const paletteFor = (name: ModuleName, mode: ThemeMode) => modulePalette(name, mode);

/**
 * The preview card's header, exactly as the module paints its own: AppBar's
 * `darkShift(mode).grad(headerGradientStops(colors.accentDeep))`, so a 90%-white
 * label clears AA on both stops. The brand has no module header to copy, so the
 * overview card takes the logo's sweep, which clears the same bar as written.
 */
const headerFor = (name: ModuleName, mode: ThemeMode): [string, string] =>
  darkShift(mode).grad(
    name === 'brand' ? BRAND_GRADIENT : headerGradientStops(paletteFor(name, mode).accentDeep),
  );

// The row dots are the accent itself, which is legible in both modes, so these
// stay simple lookups rather than becoming another per-mode table.
const HS = MODULE_PALETTES.homeservice;
const HC = MODULE_PALETTES.healthcare;
const SH = MODULE_PALETTES.shopping;

const SLIDES: Slide[] = [
  {
    key: 'overview',
    // MetroMatrix's own emerald: the overview is about the app, not a vertical.
    // The top bar already carries the name, so the eyebrow greets instead.
    paletteKey: 'brand' as ModuleName,
    eyebrow: 'Welcome',
    title: 'Your city,',
    titleAccent: 'one app.',
    subtitle:
      'Home services, healthcare and shopping — booked, tracked and paid for in a single place.',
    card: {
      title: 'Services',
      chip: 'All in one',
      rows: [
        { dot: HS.accent, primary: 'Home services', trailing: 'Book a pro' },
        { dot: HC.accent, primary: 'Healthcare', trailing: 'Consult a doctor' },
        { dot: SH.accent, primary: 'Shopping', trailing: 'Order essentials' },
      ],
    },
    badges: [
      { value: '3', label: 'Services' },
      { value: '1', label: 'Account' },
    ],
  },
  {
    key: 'homeservice',
    paletteKey: 'homeservice' as ModuleName,
    eyebrow: 'Home services',
    title: 'Verified pros,',
    titleAccent: 'booked in minutes.',
    subtitle: 'Compare rated professionals, pick a slot, and follow them to your door.',
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
    paletteKey: 'healthcare' as ModuleName,
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
    paletteKey: 'shopping' as ModuleName,
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
const WORM = 24;
// Pitch has to clear the pill or the idle dots sit flush against it: the gap to
// a neighbour is PITCH - WORM/2 - DOT/2, i.e. 4pt here.
const PITCH = 20;
const TRACK = WORM + PITCH * (SLIDES.length - 1);

// How far a stat pill hangs off the card. About half of the pill sits outside,
// so the half over the card lands on the header's empty corner at the top and
// in the body's foot padding at the bottom, never on a row.
const PILL_OVERHANG = S.xxl + S.xs;

/** The glow behind each card: wider than the card, so light spills past it. */
const GLOW = 380;

// ============================================================================

const Onboarding: React.FC = () => {
  const { colors, mode } = useTheme();
  const s = useMemo(() => makeSheet(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  // A horizontal list's items fill its height on native but not on web, where
  // `flex: 1` leaves each slide content-high and the slide's centring never
  // happens. Measured once and handed to every slide, so both agree.
  const [pageHeight, setPageHeight] = useState(0);
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

  /**
   * Persist first, then leave. The ONE way out of the intro: "Get started",
   * Skip and "Sign in" all call it, and it always opens RoleSelection.
   *
   * It used to send a stored session straight to its home, which meant a
   * browser or phone that had ever signed in — including a stale admin
   * `userType` — never showed RoleSelection again. The session is not lost:
   * RoleSelection resumes it when the matching role is picked (see
   * `resumeRouteFor` in navigation-maps/landingRoute.ts).
   */
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
    // The button knows where it is going. Web fires no scroll-end event for a
    // programmatic scroll, so leaving this to onSettle stranded the web build
    // on slide two with "Get started" out of reach; on native onSettle lands
    // on the same value.
    setIndex(index + 1);
  }, [finish, index, isLast, reduced]);

  const renderSlide = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[s.slide, { width }, pageHeight > 0 && { height: pageHeight }]}>
        <View style={s.slideBody}>
          <PreviewCard slide={item} />

          <View style={s.eyebrow}>
            <View style={[s.eyebrowDot, { backgroundColor: paletteFor(item.paletteKey, mode).accent }]} />
            <Text style={s.eyebrowText}>{item.eyebrow}</Text>
          </View>

          <Text style={s.title}>
            {item.title}
            {'\n'}
            <Text style={{ color: paletteFor(item.paletteKey, mode).accentDeep }}>{item.titleAccent}</Text>
          </Text>

          <Text style={s.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    ),
    [mode, pageHeight, s, width],
  );

  return (
    <Screen edges={['top', 'bottom']}>
      {/* The brand on every slide, and Skip where people look for it. Skip
          leaves on the last slide, where the primary button already finishes;
          the bar's height is the mark's, so nothing below moves. */}
      <View style={s.topBar}>
        <View style={s.brandRow} accessible accessibilityLabel="MetroMatrix">
          <BrandMark size={28} />
          <BrandWordmark variant="compact" style={s.brandName} />
        </View>
        {!isLast && (
          <TouchableOpacity
            onPress={() => void finish()}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Skip the introduction"
          >
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

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
        onLayout={(e: LayoutChangeEvent) => setPageHeight(e.nativeEvent.layout.height)}
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
            <View
              key={`dot-${slide.key}`}
              style={[s.dot, { left: (WORM - DOT) / 2 + i * PITCH }]}
            />
          ))}
          {SLIDES.map((slide, i) =>
            reduced ? (
              index === i ? (
                <View
                  key={`worm-${slide.key}`}
                  style={[s.worm, { left: i * PITCH, backgroundColor: paletteFor(slide.paletteKey, mode).accent }]}
                />
              ) : null
            ) : (
              <Animated.View
                key={`worm-${slide.key}`}
                style={[
                  s.worm,
                  {
                    backgroundColor: paletteFor(slide.paletteKey, mode).accent,
                    opacity: fades[i],
                    transform: [{ translateX: wormX }],
                  },
                ]}
              />
            ),
          )}
        </View>

        {/* The shared Button, so under the `brand` route it is the brand's
            emerald with its measured `onAccent` label in both modes — the one
            primary action, the same colour on every slide. */}
        <Button
          size="lg"
          label={isLast ? 'Get started' : 'Continue'}
          onPress={onPrimary}
          accessibilityLabel={isLast ? 'Get started' : 'Continue to the next slide'}
        />

        <TouchableOpacity
          // Through RoleSelection like every other exit, not straight to the
          // customer SignIn: an account can be a customer's or a provider's,
          // and RoleSelection is what asks which before its sign-in opens.
          onPress={() => void finish()}
          style={s.link}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="I already have an account. Sign in"
        >
          <Text style={s.linkText}>
            I already have an account
            <Text style={s.linkSep}>{'  ·  '}</Text>
            <Text style={s.linkStrong}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

// ── Preview card ────────────────────────────────────────────────────────────

const PreviewCard: React.FC<{ slide: Slide }> = ({ slide }) => {
  const { colors, mode } = useTheme();
  const s = useMemo(() => makeSheet(colors), [colors]);
  const { paletteKey, card, badges } = slide;
  const palette = paletteFor(paletteKey, mode);

  return (
    <View style={s.cardWrap}>
      {/* Ambient light in the slide's colour, centred behind the card — the
          same glow the splash blooms behind the logo, so the two screens read
          as one sequence. */}
      <AmbientGlow
        size={GLOW}
        color={paletteKey === 'brand' ? BRAND_GLOW[0] : palette.accent}
        edge={paletteKey === 'brand' ? BRAND_GLOW[1] : undefined}
        strength={0.2}
        style={s.glow}
      />

      <View style={s.card}>
        {/* A miniature of the module's own page header — see headerFor. */}
        <LinearGradient
          colors={headerFor(paletteKey, mode)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.cardHead}
        >
          <Text style={s.cardTitle}>{card.title}</Text>
          {/* Beside the title, not at the far edge: the top-right corner
              belongs to the overhanging stat pill. A surface pill with an ink
              label is legible on every header in both modes, where a tinted
              chip would need re-measuring per module against a gradient. */}
          <View style={s.cardChip}>
            <Text style={s.cardChipText}>{card.chip}</Text>
          </View>
        </LinearGradient>

        <View style={s.cardBody}>
          {card.rows.map((row, i) => (
            <View key={`${card.title}-${i}`} style={[s.row, row.rule && s.rowRuled]}>
              {row.dot ? (
                <View style={s.rowLead}>
                  <View style={[s.rowDot, { backgroundColor: row.dot }]} />
                </View>
              ) : (
                <View style={[s.rowLead, s.rowIcon, { backgroundColor: palette.accentSoft }]}>
                  <Ionicons
                    name={row.icon ?? 'ellipse-outline'}
                    size={14}
                    color={palette.accentDeep}
                  />
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
                    <Ionicons
                      name={row.trailingIcon}
                      size={11}
                      color={colors.star}
                      style={s.rowTrailIcon}
                    />
                  )}
                  <Text style={s.rowTrailText}>{row.trailing}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Stat pills overhanging the card. They read as data lifted out of the
          product, which is the point — the numbers are the trust cue. */}
      <View style={[s.badge, s.badgeTop, { borderColor: palette.accentLine }]}>
        <Text style={s.badgeValue}>{badges[0].value}</Text>
        <Text style={s.badgeLabel}>{badges[0].label}</Text>
      </View>
      <View style={[s.badge, s.badgeBottom, { borderColor: palette.accentLine }]}>
        <Text style={s.badgeValue}>{badges[1].value}</Text>
        <Text style={s.badgeLabel}>{badges[1].label}</Text>
      </View>
    </View>
  );
};

export default Onboarding;

// ============================================================================

const makeSheet = (c: ThemeColors) => StyleSheet.create({
  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingVertical: S.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandName: { marginLeft: S.sm },
  skipText: { ...T.label, color: c.inkMuted },

  list: { flex: 1 },
  // Clipped, so a glow wider than a narrow phone stays on its own slide.
  slide: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  slideBody: { paddingHorizontal: S.xxxl, alignItems: 'center' },

  glow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -GLOW / 2,
    marginLeft: -GLOW / 2,
  },

  // ── Card ──
  cardWrap: { width: '100%', maxWidth: 300, marginTop: PILL_OVERHANG, marginBottom: S.huge },
  card: {
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    borderRadius: R.sheet,
    ...E.raised,
  },
  // The header owns the card's top corners rather than the card clipping it:
  // `overflow: 'hidden'` on the card would clip its own iOS shadow too.
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
  },
  cardTitle: { ...T.label, color: c.inkInverse },
  cardChip: {
    backgroundColor: c.surface,
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.chip,
  },
  cardChipText: { ...T.caption, color: c.ink },
  // S.xl at the foot so the bottom pill's overlap lands in padding, not on the
  // last row.
  cardBody: { paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.xl },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm },
  rowRuled: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
    marginTop: S.xs,
    paddingTop: S.md,
  },
  rowLead: { width: 26, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { height: 26, borderRadius: R.chip },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, marginLeft: S.md },
  rowPrimary: { ...T.caption, color: c.ink },
  rowSecondary: { ...T.caption, color: c.inkMuted, marginTop: 1 },
  rowTrail: { flexDirection: 'row', alignItems: 'center' },
  rowTrailIcon: { marginRight: 3 },
  rowTrailText: { ...T.caption, color: c.ink },

  // ── Floating stat pills ──
  badge: {
    position: 'absolute',
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.card,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    ...E.raised,
  },
  badgeTop: { top: -PILL_OVERHANG, right: -10 },
  badgeBottom: { bottom: -PILL_OVERHANG, left: -10 },
  badgeValue: { ...T.bodyStrong, color: c.ink },
  badgeLabel: { ...T.caption, color: c.inkMuted, marginTop: 1 },

  // ── Copy ──
  eyebrow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, marginRight: S.sm },
  eyebrowText: { ...T.label, color: c.inkMuted },
  title: { ...T.title, color: c.ink, textAlign: 'center', marginBottom: S.md },
  subtitle: {
    ...T.body,
    color: c.inkMuted,
    textAlign: 'center',
    maxWidth: PROSE_WIDTH,
  },

  // ── Footer ──
  footer: { paddingHorizontal: GUTTER, paddingTop: S.xl, alignItems: 'center' },
  track: { width: TRACK, height: DOT, marginBottom: S.xxl, justifyContent: 'center' },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: c.disabled,
  },
  worm: {
    position: 'absolute',
    left: 0,
    width: WORM,
    height: DOT,
    borderRadius: R.pill,
  },
  // The sign-in half is the brand's text green: it is the link in the line.
  link: { paddingTop: S.md, paddingBottom: S.sm },
  linkText: { ...T.body, color: c.inkMuted },
  linkSep: { color: c.disabled },
  linkStrong: { ...T.bodyStrong, color: c.accentDeep },
});
