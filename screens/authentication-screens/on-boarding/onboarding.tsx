// ============================================================================
// Onboarding
//
// Four slides on the app's own warm paper ground, each previewing one real part
// of the product. The hero is a card showing a fragment of that module's actual
// UI — a booking row, an appointment, an order — rather than an icon standing
// in for it. A picture of the thing beats a symbol for the thing.
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
// and why no slide here holds a raw colour of its own.
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
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { resolveLandingRoute } from '../../../navigation-maps/landingRoute';
import useReducedMotion from '../../../hooks/useReducedMotion';
import {
  C,
  E,
  GUTTER,
  MODULE_PALETTES,
  ModulePalette,
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
  palette: ModulePalette;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  card: { title: string; chip: string; rows: CardRow[] };
  badges: [{ value: string; label: string }, { value: string; label: string }];
}

const HS = MODULE_PALETTES.homeservice;
const HC = MODULE_PALETTES.healthcare;
const SH = MODULE_PALETTES.shopping;

const SLIDES: Slide[] = [
  {
    key: 'overview',
    // Neutral is ink: nothing has claimed the app yet, so the overview slide
    // stays monochrome and the colour arrives with the verticals.
    palette: MODULE_PALETTES.neutral,
    eyebrow: 'MetroMatrix',
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
    palette: HS,
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
    palette: HC,
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
    palette: SH,
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

// ============================================================================

const Onboarding: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();

  // The intro plays on every launch, so this screen — not AppContainer — is
  // what stands between a returning session and its own home. `fetchMe` has
  // already settled by the time the navigator mounted, so this state is final.
  const currentUser = useAppSelector((state) => state.appContainer.currentUser);
  const currentProvider = useAppSelector((state) => state.appContainer.currentProvider);
  const userType = useAppSelector((state) => state.appContainer.userType);

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

  /**
   * Persist first, then leave. Called by both "Get started" and Skip.
   *
   * A visitor with no session lands on RoleSelection — the first screen that
   * actually asks them something. A signed-in session goes straight back to
   * its own home: replaying the intro is not a sign-out.
   */
  const finish = useCallback(async () => {
    await setOnboardingComplete(true);
    dispatch(setOnboardingStatus(true));
    navigation.replace(
      resolveLandingRoute({
        userType,
        hasUser: !!currentUser,
        hasProvider: !!currentProvider,
        providerType: currentProvider?.providerType,
      })
    );
  }, [currentProvider, currentUser, dispatch, navigation, userType]);

  const onPrimary = useCallback(() => {
    if (isLast) {
      void finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: !reduced });
  }, [finish, index, isLast, reduced]);

  // "I already have an account" is the customer path — providers reach their
  // sign-in through RoleSelection. The role still has to be set before leaving:
  // it is what puts `userType` at 'user', which `fetchMe` reads to decide which
  // account the credentials belong to. It no longer has anything to do with
  // where the next launch starts — that is always the intro now.
  const onSignIn = useCallback(async () => {
    await setOnboardingComplete(true);
    dispatch(setOnboardingStatus(true));
    dispatch(setSelectedRole('user'));
    navigation.replace('SignIn');
  }, [dispatch, navigation]);

  const renderSlide = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[s.slide, { width }]}>
        {/* Ambient module wash, well under the card. `accentSoft` is the token
            designed for exactly this — a tinted ground, not a colour. */}
        <View
          style={[
            s.washOuter,
            {
              width: width * 0.9,
              height: width * 0.9,
              borderRadius: width * 0.45,
              backgroundColor: item.palette.accentSoft,
            },
          ]}
        />

        <View style={s.slideBody}>
          <PreviewCard slide={item} />

          <View style={s.eyebrow}>
            <View style={[s.eyebrowDot, { backgroundColor: item.palette.accent }]} />
            <Text style={s.eyebrowText}>{item.eyebrow}</Text>
          </View>

          <Text style={s.title}>
            {item.title}
            {'\n'}
            <Text style={{ color: item.palette.accentDeep }}>{item.titleAccent}</Text>
          </Text>

          <Text style={s.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    ),
    [width],
  );

  return (
    <Screen background={C.bg} barStyle="dark-content" edges={['top', 'bottom']}>
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
                  style={[s.worm, { left: i * PITCH, backgroundColor: slide.palette.accent }]}
                />
              ) : null
            ) : (
              <Animated.View
                key={`worm-${slide.key}`}
                style={[
                  s.worm,
                  {
                    backgroundColor: slide.palette.accent,
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
            <Text style={s.linkSep}>{'  ·  '}</Text>
            <Text style={s.linkStrong}>Sign in</Text>
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
  const { palette, card, badges } = slide;

  return (
    <View style={s.cardWrap}>
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>{card.title}</Text>
          {/* Ground carries the module, label stays ink. `accentDeep` on
              `accentSoft` is only 3.9:1 for shopping — fine for the icon below
              (icons need 3.0) but short of the 4.5 this 12pt label needs. */}
          <View style={[s.cardChip, { backgroundColor: palette.accentSoft }]}>
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
                    color={C.star}
                    style={s.rowTrailIcon}
                  />
                )}
                <Text style={s.rowTrailText}>{row.trailing}</Text>
              </View>
            )}
          </View>
        ))}
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

const s = StyleSheet.create({
  list: { flex: 1 },
  slide: { flex: 1, justifyContent: 'center' },
  slideBody: { paddingHorizontal: S.xxxl, alignItems: 'center' },

  washOuter: { position: 'absolute', top: '6%', left: '5%' },

  // ── Card ──
  cardWrap: { width: '100%', maxWidth: 300, marginBottom: S.xxxl },
  card: {
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderRadius: R.sheet,
    padding: S.lg,
    ...E.raised,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.md,
  },
  cardTitle: { ...T.label, color: C.ink },
  cardChip: { paddingHorizontal: S.sm, paddingVertical: 3, borderRadius: R.chip },
  cardChipText: { ...T.caption, color: C.ink },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm },
  rowRuled: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.lineSoft,
    marginTop: S.xs,
    paddingTop: S.md,
  },
  rowLead: { width: 26, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { height: 26, borderRadius: R.chip },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, marginLeft: S.md },
  rowPrimary: { ...T.caption, color: C.ink },
  rowSecondary: { ...T.caption, color: C.inkMuted, marginTop: 1 },
  rowTrail: { flexDirection: 'row', alignItems: 'center' },
  rowTrailIcon: { marginRight: 3 },
  rowTrailText: { ...T.caption, color: C.ink },

  // ── Floating stat pills ──
  badge: {
    position: 'absolute',
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.card,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    ...E.raised,
  },
  badgeTop: { top: -14, right: -10 },
  badgeBottom: { bottom: -14, left: -10 },
  badgeValue: { ...T.bodyStrong, color: C.ink },
  badgeLabel: { ...T.caption, color: C.inkMuted, marginTop: 1 },

  // ── Copy ──
  eyebrow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, marginRight: S.sm },
  eyebrowText: { ...T.label, color: C.inkMuted },
  title: { ...T.title, color: C.ink, textAlign: 'center', marginBottom: S.md },
  subtitle: {
    ...T.body,
    color: C.inkMuted,
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
    backgroundColor: C.disabled,
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
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { ...T.subhead, color: C.inkInverse },
  link: { paddingVertical: S.md },
  linkText: { ...T.body, color: C.inkMuted },
  linkSep: { color: C.disabled },
  linkStrong: { ...T.bodyStrong, color: C.ink },
  skipSlot: { height: 36, justifyContent: 'center' },
  skipText: { ...T.body, color: C.inkMuted },
});
