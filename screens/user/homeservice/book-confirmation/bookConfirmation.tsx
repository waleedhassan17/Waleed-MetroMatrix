// ============================================================================
// Booking confirmation — the wait for a provider to accept
//
// THE ONE HERO
// ------------
// This screen owns the module's single brand gradient, in `HeroBanner`, on the
// accepted state. That is the whole gradient budget for home services, spent
// on the one moment that has earned emphasis. Nowhere else.
//
// What went: 13 Animated.Values, three infinite loops (shimmer, avatar pulse,
// expanding rings), a gradient hero with three decorative circles, a "LIVE"
// pulse chip, a gradient notification card, staggered button entrances and a
// gradient cancel modal. What stayed: a checkmark that scales in once when
// acceptance actually lands.
//
// NO COUNTDOWN. This screen used to run a five-minute clock and expire the
// request itself when it hit zero — but only on the phone that was watching.
// The booking stayed PENDING on the server, the provider kept seeing a live
// job, and accepting it after the clock ran out left the customer looking at
// "No reply in time" for a booking that had been confirmed. A deadline the
// server does not enforce is not a deadline; it is a lie told to whoever is
// looking at the screen. The request now waits until the provider answers or
// the customer cancels, and the steps below say where it has got to.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  HeroBanner,
  Screen,
} from '../../../../components/ui';
import { categoryAccent } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { useRoomSocket } from '../../../../hooks/useRoomSocket';
import { AppDispatch, RootState } from '../../../../store/store';
import { formatBookingDate, formatRating } from '../../../../utils/homeservice/format';
import {
  cancelBooking,
  cancelBookingRequest,
  checkBookingStatus,
  initializeConfirmation,
  resetConfirmation,
  selectBookingConfirmation,
  selectCancellationReason,
  selectConfirmationDetails,
  selectConfirmationProvider,
  setBookingStatus,
} from './bookConfirmationSlice';

type RouteParams = {
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
  // The real id from POST /bookings.
  bookingId?: string;
};

// Backstop for the socket. The screen previously "accepted" every booking
// after 10 seconds regardless of what the provider did.
const STATUS_POLL_INTERVAL_MS = 10000;

const STEPS = [
  { key: 'sent', label: 'Sent', icon: 'paper-plane-outline' },
  { key: 'notified', label: 'Notified', icon: 'notifications-outline' },
  { key: 'waiting', label: 'Waiting', icon: 'hourglass-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
];

export default function BookConfirmationScreen() {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const reducedMotion = useReducedMotion();

  const { category = 'ac-repairers', bookingId: routeBookingId } = route.params || {};
  const accent = categoryAccent(category, mode);

  const bookingConfirmation = useSelector(selectBookingConfirmation);
  const provider = useSelector(selectConfirmationProvider);
  const bookingDetails = useSelector(selectConfirmationDetails);
  const cancellationReason = useSelector(selectCancellationReason);

  // What POST /bookings returned, still sitting in the booking slice. Seeding
  // from it spares a round trip on the common path (straight from checkout).
  const createdBooking = useSelector((state: RootState) => state.booking?.bookingConfirmation);

  // The one id every downstream screen keys off. Route param first (freshest),
  // then whatever the store already holds. There is no fallback beyond that —
  // no booking means no id, and the screen says so.
  const bookingId = routeBookingId || bookingConfirmation?.bookingId || '';

  // Live status straight from the realtime service, same hook serviceStatus
  // and liveTracking use.
  const { roomStatus } = useRoomSocket(bookingId || undefined, 'homeservice');

  const [showCancelSheet, setShowCancelSheet] = useState(false);

  // The only animation left: the success checkmark, which fires once when a
  // real acceptance arrives.
  const checkmark = useRef(new Animated.Value(0)).current;

  const bookingStatus = bookingConfirmation?.status || 'waiting';

  // Seed the confirmation from what POST /bookings returned when it is still in
  // the store, and read GET /bookings/:id otherwise (deep link, app resumed).
  useEffect(() => {
    if (!bookingId) return;
    if (bookingConfirmation?.bookingId === bookingId) return;

    const seeded =
      createdBooking && createdBooking.bookingId === bookingId ? createdBooking : null;

    dispatch(
      initializeConfirmation({
        bookingId,
        provider: (seeded?.provider as any) ?? null,
        bookingDetails: (seeded?.bookingDetails as any) ?? null,
      })
    );
  }, [dispatch, bookingId, bookingConfirmation?.bookingId, createdBooking]);

  // Provider accepted/declined over the socket.
  useEffect(() => {
    const next = (roomStatus as any)?.status;
    if (!next) return;

    if (next === 'confirmed' || next === 'accepted') {
      dispatch(setBookingStatus('accepted'));
    } else if (next === 'rejected' || next === 'declined') {
      dispatch(setBookingStatus('declined'));
    } else if (next === 'cancelled') {
      dispatch(setBookingStatus('cancelled'));
      // The socket frame carries a status, not a reason, and the poll below
      // has already stopped by the time this runs. Read the booking once more
      // so the screen can say WHY — "someone accepted this job first" is the
      // difference between a cancellation the customer understands and a
      // request that vanished on them.
      if (bookingId) dispatch(checkBookingStatus(bookingId));
    }
  }, [roomStatus, dispatch, bookingId]);

  // Polling backstop: if the realtime service is unreachable the customer must
  // still find out that their booking was accepted.
  useEffect(() => {
    if (!bookingId || bookingStatus !== 'waiting') return;
    const poll = setInterval(() => {
      dispatch(checkBookingStatus(bookingId));
    }, STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [dispatch, bookingId, bookingStatus]);

  // Driven by a REAL 'accepted' status rather than a 10-second timer that fired
  // whether or not a provider ever responded.
  useEffect(() => {
    if (bookingStatus !== 'accepted') return;
    if (reducedMotion) {
      checkmark.setValue(1);
      return;
    }
    const animation = Animated.spring(checkmark, {
      toValue: 1,
      tension: 90,
      friction: 9,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [bookingStatus, checkmark, reducedMotion]);

  // Cancelling must reach the server — otherwise the provider keeps seeing a
  // live job the customer believes they cancelled.
  const handleConfirmCancel = useCallback(() => {
    if (bookingId) {
      dispatch(cancelBookingRequest(bookingId));
    } else {
      dispatch(cancelBooking());
    }
    navigation.goBack();
  }, [dispatch, navigation, bookingId]);

  const handleBackToProviders = useCallback(() => {
    dispatch(resetConfirmation());
    navigation.goBack();
  }, [dispatch, navigation]);

  // Reaching this screen without a booking id is a caller bug. Say so plainly
  // instead of rendering a confirmation for a booking that does not exist.
  if (!bookingId) {
    if (__DEV__) {
      console.warn('[BookConfirmation] opened with no bookingId — check the caller.');
    }
    return (
      <Screen>
        <AppBar title="Booking" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="calendar-outline"
          tone="error"
          title="No active booking"
          message="We couldn't find a booking to confirm. Start a new one and we'll take it from there."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const rating = formatRating(provider?.rating);
  const stepIndex = bookingStatus === 'accepted' ? 3 : 2;

  const renderProviderCard = () => (
    <Card accentRule={accent.tint} style={styles.providerCard}>
      <View style={styles.providerRow}>
        <Avatar
          uri={provider?.image}
          name={provider?.name}
          size={48}
          tint={accent.tintSoft}
          color={accent.tint}
        />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {provider?.name || 'Assigning a provider'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[provider?.specialty || accent.label, provider?.experience].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {!!rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
      </View>

      {(!!bookingDetails?.selectedDate || !!bookingDetails?.selectedAddress) && (
        <View style={styles.details}>
          {!!bookingDetails?.selectedDate && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.inkFaint} />
              <Text style={styles.detailText} numberOfLines={1}>
                {[
                  formatBookingDate(bookingDetails.selectedDate) ?? bookingDetails.selectedDate,
                  bookingDetails.selectedTime,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}
          {!!bookingDetails?.selectedAddress && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={15} color={colors.inkFaint} />
              <Text style={styles.detailText} numberOfLines={1}>
                {bookingDetails.selectedAddress.address}
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );

  const renderWaiting = () => {
    if (bookingStatus !== 'waiting') return null;

    return (
      <>
        <Card style={styles.card}>
          <Text style={styles.waitTitle}>Waiting for a reply</Text>
          <Text style={styles.body}>
            {provider?.name || 'The provider'} has your request. We'll tell you the moment they
            accept. You can keep booking other providers while you wait.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => {
              const done = index < stepIndex;
              const active = index === stepIndex;
              const color = done ? colors.success : active ? colors.ink : colors.inkFaint;
              return (
                <View key={step.key} style={styles.step}>
                  <Ionicons name={step.icon as any} size={16} color={color} />
                  <Text style={[styles.stepLabel, { color }]}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Button
          label="Cancel request"
          variant="destructive"
          onPress={() => setShowCancelSheet(true)}
          style={styles.blockButton}
        />
      </>
    );
  };

  const renderAccepted = () => {
    if (bookingStatus !== 'accepted') return null;

    return (
      <>
        <Animated.View style={{ opacity: checkmark, transform: [{ scale: checkmark }] }}>
          <HeroBanner
            icon="checkmark-circle"
            title="Booking confirmed"
            message={`${provider?.name || 'Your provider'} accepted. You can follow them on the map or check the job status any time.`}
          />
        </Animated.View>

        <Button
          label="Track provider"
          icon="navigate-outline"
          onPress={() => navigation.navigate('liveTracking', { category, bookingId })}
          style={styles.blockButton}
        />
        <Button
          label="Service status"
          variant="secondary"
          icon="document-text-outline"
          onPress={() => navigation.navigate('serviceStatus', { category, bookingId })}
          style={styles.stackedButton}
        />
      </>
    );
  };

  const renderEnded = () => {
    const config = {
      declined: {
        icon: 'close-circle-outline',
        title: 'Provider unavailable',
        message: `${provider?.name || 'They'} can't take this job right now. Other providers in your area can.`,
      },
      cancelled: {
        icon: 'remove-circle-outline',
        title: 'Booking cancelled',
        // The server's own reason when it has one — this is how a customer
        // learns their other requests were released because someone accepted
        // first, rather than watching a request vanish unexplained.
        message:
          cancellationReason ||
          "This request was cancelled. You can book someone else whenever you're ready.",
      },
    }[bookingStatus as 'declined' | 'cancelled'];

    if (!config) return null;

    return (
      <>
        <Card style={styles.card}>
          <View style={styles.endedRow}>
            <View style={styles.endedIcon}>
              <Ionicons name={config.icon as any} size={22} color={colors.inkMuted} />
            </View>
            <View style={styles.endedText}>
              <Text style={styles.waitTitle}>{config.title}</Text>
              <Text style={styles.body}>{config.message}</Text>
            </View>
          </View>
        </Card>

        <Button
          label="Find another provider"
          onPress={handleBackToProviders}
          style={styles.blockButton}
        />
      </>
    );
  };

  return (
    <Screen>
      <AppBar title="Booking status" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderProviderCard()}
        {renderWaiting()}
        {renderAccepted()}
        {renderEnded()}

        <Text style={styles.support}>
          Something not right? Reach support from your profile.
        </Text>
      </ScrollView>

      <ActionSheet
        visible={showCancelSheet}
        title="Cancel this request?"
        message={`${provider?.name || 'The provider'} will stop seeing this job.`}
        cancelLabel="Keep waiting"
        onClose={() => setShowCancelSheet(false)}
        options={[
          {
            label: 'Cancel request',
            icon: 'close-circle-outline',
            tone: 'destructive',
            onPress: handleConfirmCancel,
          },
        ]}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
  },

  providerCard: {
    marginBottom: SECTION,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginHorizontal: S.md,
  },
  providerName: {
    ...T.subhead,
    color: c.ink,
  },
  meta: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...T.label,
    color: c.ink,
    marginLeft: 3,
  },
  details: {
    marginTop: S.md,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs,
  },
  detailText: {
    ...T.caption,
    color: c.inkMuted,
    marginLeft: S.sm,
    flexShrink: 1,
  },

  card: {
    marginBottom: S.lg,
  },
  waitTitle: {
    ...T.subhead,
    color: c.ink,
  },
  body: {
    ...T.body,
    color: c.inkMuted,
    marginTop: S.xs,
    maxWidth: PROSE_WIDTH,
  },

  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: S.xl,
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepLabel: {
    ...T.caption,
    marginTop: S.xs,
  },

  blockButton: {
    marginTop: S.lg,
  },
  stackedButton: {
    marginTop: S.md,
  },

  endedRow: {
    flexDirection: 'row',
  },
  endedIcon: {
    width: 44,
    height: 44,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedText: {
    flex: 1,
    marginLeft: S.md,
  },

  support: {
    ...T.caption,
    color: c.inkFaint,
    textAlign: 'center',
    marginTop: SECTION,
  },
});
