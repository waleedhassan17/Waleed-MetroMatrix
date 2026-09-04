// ============================================================================
// Bookings — the customer's list of jobs
//
// This card is the workhorse of the module, so it carries the design rules
// most visibly:
//   • one status pill, not four competing pills
//   • a 3px category rule instead of a stock photo and a gradient wash
//   • human dates, and "Priced on completion" rather than "PKR 0"
//   • no entrance animation and no press-scale — a list of ten cards that each
//     fade and slide in on mount is decoration that delays the content
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AppBar,
  Avatar,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonCard,
  StatusPill,
} from '../../../../../components/ui';
import {
  ACTIVE_STATUSES,
  categoryAccent,
  HS,
} from '../../../../../constants/HomeServiceTheme';
import { C, GUTTER, R, S, T } from '../../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import { isCallingSupported } from '../../../../../services/call/usePeerConnection';
import { formatBookingWhen, formatPrice } from '../../../../../utils/homeservice/format';
import {
  fetchBookings,
  selectBookingsError,
  selectBookingsLoading,
  selectHomeServiceBookings,
  type Booking,
  type BookingStatus,
} from './bookingSlice';

// Types, thunk and selectors all come from the slice — this screen used to
// declare its own narrower Booking type and render a hardcoded mockBookings
// array, which is why a freshly created booking never showed up here.
type FilterType = 'all' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

// The server's status vocabulary is wider than the filter tabs. A booking is
// PENDING the moment it is created and only becomes CONFIRMED once a provider
// accepts, so both must count as "Upcoming" — otherwise the booking a customer
// just made is still missing from this list.
const FILTER_STATUSES: Record<Exclude<FilterType, 'all'>, BookingStatus[]> = {
  upcoming: ['pending', 'confirmed', 'upcoming'],
  in_progress: ['in_progress'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

const matchesFilter = (booking: Booking, filter: FilterType) =>
  filter === 'all' || FILTER_STATUSES[filter].includes(booking.status);

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'in_progress', label: 'Active' },
  { key: 'completed', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Five filters do not fit across a small phone, so the row scrolls — and a row
// that scrolls with "Cancelled" sheared off at the edge reads as a broken
// layout, not as more content. Two things make the scroll honest: a fade on
// whichever edge still has chips behind it, and a chip that brings itself into
// view when picked. `#FFFFFFxx` rather than a literal rgba() so the fade stays
// tied to the surface token.
const FADE_WIDTH = 28;
const EDGE_EPSILON = 4;
const FADE_START_COLORS = [C.surface, `${C.surface}00`] as const;
const FADE_END_COLORS = [`${C.surface}00`, C.surface] as const;
const FADE_FROM = { x: 0, y: 0 };
const FADE_TO = { x: 1, y: 0 };

// ── Card ────────────────────────────────────────────────────────────────────

// Memoised: FlatList re-renders its rows whenever the screen re-renders (a
// filter tap, a refresh flag), and every card here is a pure function of a
// booking object the store hands back by reference.
const BookingCard = React.memo(function BookingCard({ booking }: { booking: Booking }) {
  const navigation = useNavigation<any>();
  // Cached after the first call — a native module cannot appear at runtime.
  const callingSupported = isCallingSupported();
  const category = categoryAccent(booking.categoryType);
  const isActive = ACTIVE_STATUSES.includes(booking.status as any);

  // Only claim a booking is unpaid when the server actually said so. An older
  // backend omits `payment` entirely; treating that absence as "unpaid" would
  // replace every Rate button with a Pay button during a staged rollout.
  const unpaid = !!booking.payment && booking.payment.status !== 'paid';

  // Both entry points carry the real bookingId, which is the room id the
  // call/chat screens resolve against.
  const contactParams = {
    bookingId: booking.id,
    counterpartName: booking.providerName,
    counterpartImage: booking.providerAvatar,
  };

  // At most one secondary action, and it is whatever the booking needs next:
  // settle up before reviewing, the same order Booking Detail gates on.
  const nextAction = (() => {
    if (booking.status !== 'completed') return null;
    if (unpaid) {
      return {
        label: 'Pay now',
        onPress: () =>
          navigation.navigate('PaymentScreen', {
            bookingId: booking.id,
            category: booking.categoryType as any,
          }),
      };
    }
    if (!booking.rating) {
      return {
        label: 'Rate service',
        onPress: () =>
          navigation.navigate('ReviewRating', {
            bookingId: booking.id,
            category: booking.categoryType as any,
          }),
      };
    }
    return null;
  })();

  return (
    <Card
      accentRule={category.tint}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
      accessibilityLabel={`${booking.serviceName} with ${booking.providerName}`}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {booking.serviceName}
        </Text>
        <StatusPill status={booking.status} size="sm" style={styles.statusPill} />
      </View>

      <View style={styles.providerRow}>
        <Avatar
          uri={booking.providerAvatar}
          name={booking.providerName}
          size={28}
          tint={category.tintSoft}
          color={category.tint}
        />
        <Text style={styles.providerName} numberOfLines={1}>
          {booking.providerName}
        </Text>

        {isActive && (
          <View style={styles.contactRow}>
            {/* Call is hidden in builds that cannot place one at all
                (react-native-webrtc unlinked). Message is always offered —
                it is durable. */}
            {callingSupported && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => navigation.navigate('CallScreen', contactParams)}
                accessibilityLabel={`Call ${booking.providerName}`}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="call-outline" size={16} color={HS.accentDeep} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => navigation.navigate('ProviderChatScreen', contactParams)}
              accessibilityLabel={`Message ${booking.providerName}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={HS.accentDeep} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.meta} numberOfLines={1}>
        {[category.label, formatBookingWhen(booking.date, booking.time), booking.address]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      <View style={styles.cardFooter}>
        {/* A booking is priced on completion, so before then there is no
            number to show — "PKR 0" read as a free job. */}
        <Text style={styles.price}>{formatPrice(booking.price)}</Text>

        {booking.status === 'completed' && !!booking.rating ? (
          <View style={styles.ratedRow}>
            <Ionicons name="star" size={13} color={C.star} />
            <Text style={styles.ratedText}>You rated {booking.rating}</Text>
          </View>
        ) : nextAction ? (
          <TouchableOpacity
            onPress={nextAction.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
          >
            <Text style={styles.nextAction}>{nextAction.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
});

// ── Screen ──────────────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useAppDispatch();
  const bookings = useAppSelector(selectHomeServiceBookings);
  const loading = useAppSelector(selectBookingsLoading);
  const errors = useAppSelector(selectBookingsError);

  // Refetch on every focus so a booking made moments ago on another screen is
  // already here when the customer switches to this tab.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBookings(undefined));
    }, [dispatch])
  );

  const filteredBookings = useMemo(
    () => bookings.filter((b) => matchesFilter(b, activeFilter)),
    [bookings, activeFilter]
  );

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<FilterType, number>>((acc, { key }) => {
        acc[key] =
          key === 'all' ? bookings.length : bookings.filter((b) => matchesFilter(b, key)).length;
        return acc;
      }, {} as Record<FilterType, number>),
    [bookings]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchBookings(undefined));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // ── Filter row: edge fades and reveal-on-select ───────────────────────────
  //
  // Widths and offset live in refs, not state: they are read inside handlers
  // and never rendered, so keeping them out of state saves a re-render on
  // every scroll frame. Only the two fade flags are state, and `syncFade`
  // returns the previous object unchanged when neither flipped, which makes
  // React bail out of the render entirely.
  const filterScroll = useRef<ScrollView>(null);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);
  const scrollX = useRef(0);
  const chipLayouts = useRef<Partial<Record<FilterType, { x: number; width: number }>>>({});
  const [fade, setFade] = useState({ start: false, end: false });

  const syncFade = useCallback(() => {
    const start = scrollX.current > EDGE_EPSILON;
    const end = contentWidth.current - viewportWidth.current - scrollX.current > EDGE_EPSILON;
    setFade((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  const onFilterScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.current = e.nativeEvent.contentOffset.x;
      syncFade();
    },
    [syncFade]
  );

  const onFilterLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportWidth.current = e.nativeEvent.layout.width;
      syncFade();
    },
    [syncFade]
  );

  const onFilterContentSize = useCallback(
    (width: number) => {
      contentWidth.current = width;
      syncFade();
    },
    [syncFade]
  );

  // Picking a chip that is half past the edge should bring it fully into view —
  // otherwise the filter you just chose is the one you cannot read.
  const selectFilter = useCallback((key: FilterType) => {
    setActiveFilter(key);

    const chip = chipLayouts.current[key];
    if (!chip || !viewportWidth.current) return;
    // `x` is measured inside the content container, so it already carries the
    // row's leading gutter; backing it out again lands the chip flush on the
    // screen edge instead of inset from it.
    const start = chip.x - GUTTER;
    const end = chip.x + chip.width + GUTTER;
    if (start < scrollX.current) {
      filterScroll.current?.scrollTo({ x: Math.max(start, 0), animated: true });
    } else if (end > scrollX.current + viewportWidth.current) {
      filterScroll.current?.scrollTo({ x: end - viewportWidth.current, animated: true });
    }
  }, []);

  const coldLoad = loading.fetch && bookings.length === 0;
  const failed = !!errors.fetch && bookings.length === 0;
  const activeLabel = FILTERS.find((f) => f.key === activeFilter)?.label.toLowerCase();

  const renderBooking = useCallback(
    ({ item }: { item: Booking }) => <BookingCard booking={item} />,
    []
  );

  /* The loader only shows on a cold fetch — a pull-to-refresh already has its
     own spinner. A failed fetch used to fall through to "No bookings yet",
     which told the customer their bookings were gone rather than that the
     request failed. */
  const listEmpty = coldLoad ? (
    <View accessibilityLabel="Loading bookings">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <SkeletonCard lines={2} />
        </View>
      ))}
    </View>
  ) : failed ? (
    <ErrorState
      title="We couldn't load your bookings"
      message={errors.fetch}
      onRetry={() => dispatch(fetchBookings(undefined))}
    />
  ) : bookings.length === 0 ? (
    // Keyed off the whole list, not off `activeFilter`: with no bookings at
    // all there is nothing under any filter, so "try another filter" would be
    // sending the customer around an empty screen instead of offering the one
    // thing that helps.
    <EmptyState
      icon="calendar-outline"
      title="No bookings yet"
      message="Book an electrician, plumber or AC technician and it will show up here."
      actionLabel="Browse services"
      onAction={() => navigation.navigate('ProvidersScreen', {})}
    />
  ) : (
    <EmptyState
      icon="calendar-outline"
      title={`No ${activeLabel} bookings`}
      message="The rest of your bookings are under another filter."
      actionLabel="Show all bookings"
      onAction={() => selectFilter('all')}
    />
  );

  return (
    <Screen>
      <AppBar title="Bookings" hideBack />

      <View style={styles.filters}>
        <ScrollView
          ref={filterScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          onLayout={onFilterLayout}
          onContentSizeChange={onFilterContentSize}
          onScroll={onFilterScroll}
          scrollEventThrottle={16}
        >
          {FILTERS.map((filter) => (
            <View
              key={filter.key}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                chipLayouts.current[filter.key] = { x, width };
              }}
            >
              <Chip
                label={filter.label}
                // A row of five zeroes is noise. The badge exists to point at
                // where the bookings are, so it only appears where there are
                // any — the chip itself still says the filter is available.
                count={counts[filter.key] || undefined}
                selected={activeFilter === filter.key}
                onPress={() => selectFilter(filter.key)}
              />
            </View>
          ))}
        </ScrollView>

        {fade.start && (
          <LinearGradient
            colors={FADE_START_COLORS}
            start={FADE_FROM}
            end={FADE_TO}
            pointerEvents="none"
            style={[styles.fade, styles.fadeStart]}
          />
        )}
        {fade.end && (
          <LinearGradient
            colors={FADE_END_COLORS}
            start={FADE_FROM}
            end={FADE_TO}
            pointerEvents="none"
            style={[styles.fade, styles.fadeEnd]}
          />
        )}
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        // Centred only for a real empty or error state. The cold-load skeletons
        // stand in for rows, so they stay pinned to the top where the rows will
        // be — centring them makes the list jump when the data lands.
        contentContainerStyle={[
          styles.list,
          filteredBookings.length === 0 && !coldLoad && styles.listCentered,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[HS.accent]}
            tintColor={HS.accent}
          />
        }
        ListEmptyComponent={listEmpty}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  filtersContent: {
    paddingHorizontal: GUTTER,
    paddingVertical: S.md,
    // `gap`, not a margin on every chip: a trailing margin on the last one
    // stacks with the gutter and leaves the row ending short of the edge.
    gap: S.sm,
  },
  // Absolute children sit inside the border box, so `bottom: 0` already stops
  // short of the row's bottom rule rather than painting over it.
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeStart: { left: 0 },
  fadeEnd: { right: 0 },

  list: {
    padding: GUTTER,
    // The tab bar is docked and lays out below this list, so it needs clearing
    // by exactly nothing — the old 120 was for a floating bar this module does
    // not have, and left a screen's worth of dead scroll under the last card.
    paddingBottom: S.xxxl,
  },
  // Fills the viewport so an empty or error state sits in the middle of the
  // space it owns instead of clinging to the top of it.
  listCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: S.md,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serviceName: {
    ...T.subhead,
    color: C.ink,
    flex: 1,
    marginRight: S.sm,
  },
  statusPill: {
    marginTop: 1,
  },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  providerName: {
    ...T.body,
    color: C.inkMuted,
    flex: 1,
    marginLeft: S.sm,
  },
  contactRow: {
    flexDirection: 'row',
  },
  contactButton: {
    width: 32,
    height: 32,
    borderRadius: R.chip,
    backgroundColor: HS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: S.sm,
  },

  meta: {
    ...T.caption,
    color: C.inkMuted,
    marginTop: S.sm,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.md,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.lineSoft,
  },
  price: {
    ...T.bodyStrong,
    color: C.ink,
  },
  nextAction: {
    ...T.label,
    color: HS.accentDeep,
  },
  ratedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratedText: {
    ...T.caption,
    color: C.inkMuted,
    marginLeft: 4,
  },
});
