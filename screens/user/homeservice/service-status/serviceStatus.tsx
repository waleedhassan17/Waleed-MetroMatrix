// ============================================================================
// Service status — the live job
//
// The timeline is the hero here: it is the one thing a customer opens this
// screen to read. Everything above and below it is quieter than it was.
//
// What went: 13 gradients, the avatar pulse loop, the entrance fade/slide, the
// party-popper "Service Completed!" heading, and the "Need Assistance? Our
// support team is available 24/7" card. The completion moment now reads
// "Service completed" with the two things you can do next.
//
// The contact sheet was already a styled component (components/call/
// ContactSheet) — the remaining native Alerts (leave-without-paying, a failed
// completion, an invalid amount) are now an ActionSheet and inline errors.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import ContactSheet from '../../../../components/call/ContactSheet';
import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
} from '../../../../components/ui';
import { categoryAccent, HS } from '../../../../constants/HomeServiceTheme';
import { C, F, GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { useRoomSocket } from '../../../../hooks/useRoomSocket';
import { AppDispatch, RootState } from '../../../../store/store';
import { contactSupport } from '../../../../utils/support/contactSupport';
import { formatAmount, formatInstant, formatRating } from '../../../../utils/homeservice/format';
import {
  clearServiceStatusState,
  fetchServiceStatus,
  markServiceCompleted,
  selectPaymentSummary,
  selectServiceProgress,
  setPaymentAmount,
} from './serviceSlice';

type RouteParams = {
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
  bookingId?: string;
};

export default function ServiceStatusScreen() {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();

  const { category = 'ac-repairers', bookingId } = route.params || {};
  const validCategory = (['electricians', 'plumbers', 'ac-repairers'].includes(category)
    ? category
    : 'ac-repairers') as 'electricians' | 'plumbers' | 'ac-repairers';
  const accent = categoryAccent(validCategory, mode);

  // `counterpartPresence` is the server's word on whether the provider has a
  // live socket — the reachability half of the Call gate in the contact sheet.
  const {
    roomStatus,
    payment: livePayment,
    counterpartPresence,
  } = useRoomSocket(bookingId, 'homeservice');

  const provider = useSelector((state: RootState) => state.serviceStatus?.provider);
  const serviceDetails = useSelector((state: RootState) => state.serviceStatus?.serviceDetails);
  const payment = useSelector((state: RootState) => state.serviceStatus?.payment);
  const serviceStatus = useSelector((state: RootState) => state.serviceStatus?.serviceStatus);
  const isLoading = useSelector((state: RootState) => state.serviceStatus?.isLoading);
  const isSubmitting = useSelector((state: RootState) => state.serviceStatus?.isSubmitting);
  const error = useSelector((state: RootState) => state.serviceStatus?.error);
  const paymentSummary = useSelector(selectPaymentSummary);
  const progressSteps = useSelector(selectServiceProgress);

  // The card used to print `provider.startTime` raw, so a customer saw
  // "Started 2026-09-03T18:22:41.507Z". Null when the job has not started.
  const startedAtLabel = useMemo(() => formatInstant(provider?.startTime), [provider?.startTime]);
  const completedAtLabel = useMemo(
    () => formatInstant(serviceDetails?.completedAt),
    [serviceDetails?.completedAt]
  );

  const [manualAmount, setManualAmount] = useState('');
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Pull-to-refresh. Live socket events already push most changes, but a
  // dropped socket used to leave this screen stale with no way to reload it
  // short of navigating away and back.
  const onRefresh = useCallback(async () => {
    if (!bookingId) return;
    setIsRefreshing(true);
    try {
      await dispatch(fetchServiceStatus({ bookingId, category: validCategory }));
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, bookingId, validCategory]);

  // Whether payment is still owed is SERVER state, not screen state. This was a
  // local flag reset on every focus, so completing a job and then leaving —
  // even by the phone's back button — made the booking permanently unpayable
  // from this screen. Derived, it survives navigation and app restarts.
  const paymentDue = serviceStatus === 'completed' && payment?.status !== 'completed';

  const leaveScreen = useCallback(() => {
    dispatch(clearServiceStatusState());
    navigation.goBack();
  }, [dispatch, navigation]);

  const handleBackPress = useCallback(() => {
    if (paymentDue) {
      setShowLeaveSheet(true);
      return;
    }
    leaveScreen();
  }, [paymentDue, leaveScreen]);

  // The header chevron ran the guard above; the phone's back button did not,
  // which was the actual route by which people left a completed job unpaid.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackPress();
        return true; // handled — we navigate ourselves, after the guard
      });
      return () => sub.remove();
    }, [handleBackPress])
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(clearServiceStatusState());

      // No id, no fetch — 'default' was never a booking, it was just a 404
      // waiting to happen.
      if (!bookingId) {
        if (__DEV__) {
          console.warn('[serviceStatus] no bookingId in route params — skipping fetch.');
        }
        return;
      }

      const timer = setTimeout(() => {
        dispatch(fetchServiceStatus({ bookingId, category: validCategory }));
      }, 50);

      return () => clearTimeout(timer);
    }, [bookingId, validCategory, dispatch])
  );

  // A pushed status or payment event means the server-side truth moved on.
  // Refetch rather than patching local state so provider, pricing and timeline
  // stay consistent with each other.
  useEffect(() => {
    if (!bookingId) return;
    if (!roomStatus && !livePayment) return;
    dispatch(fetchServiceStatus({ bookingId, category: validCategory }));
  }, [roomStatus, livePayment, bookingId, validCategory, dispatch]);

  const handleServiceCompleted = useCallback(async () => {
    if (!bookingId) return;
    setCompleteError(null);
    try {
      // unwrap() so a rejected transition throws here instead of being
      // swallowed — this used to fire and forget, then reveal the payment card
      // on a timer whether or not the server had agreed the job was done.
      await dispatch(markServiceCompleted({ bookingId })).unwrap();
    } catch (e: any) {
      setCompleteError(
        typeof e === 'string'
          ? e
          : e?.message || "We couldn't mark this complete. Check your connection and try again."
      );
      return; // stay on the pre-completion UI
    }

    // Re-read the server so completedAt, pricing and the timeline all come from
    // one consistent payload.
    dispatch(fetchServiceStatus({ bookingId, category: validCategory }));
  }, [dispatch, bookingId, validCategory]);

  const handleAmountChange = useCallback(
    (text: string) => {
      const numericValue = text.replace(/[^0-9]/g, '');
      setManualAmount(numericValue);
      dispatch(setPaymentAmount(parseInt(numericValue) || 0));
    },
    [dispatch]
  );

  const amountEntered = !!payment?.amount && payment.amount > 0;

  // No booking means no status to show — don't spin forever.
  if (!bookingId) {
    return (
      <Screen>
        <AppBar title="Service status" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="clipboard-outline"
          title="No active booking"
          message="Open a booking from your list to follow its progress."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  // A failed fetch leaves `provider` null with `isLoading` false. Without this
  // branch that fell into the loading state below and spun forever.
  if (!isLoading && !provider && error) {
    return (
      <Screen>
        <AppBar title="Service status" onBack={() => navigation.goBack()} />
        <ErrorState
          title="We couldn't load this job"
          message={error}
          onRetry={onRefresh}
        />
      </Screen>
    );
  }

  if (isLoading || !provider) {
    return (
      <Screen>
        <AppBar title="Service status" onBack={() => navigation.goBack()} />
        <View style={styles.loading} accessibilityLabel="Loading service status">
          <Skeleton width="100%" height={104} radius={R.card} />
          <Skeleton width="40%" height={16} style={styles.loadingGap} />
          <Skeleton width="100%" height={180} radius={R.card} style={styles.loadingGapSm} />
        </View>
      </Screen>
    );
  }

  const rating = formatRating(provider.rating);

  return (
    <Screen>
      <AppBar
        title="Service status"
        onBack={handleBackPress}
        rightIcon="chatbubble-outline"
        onRightPress={() => setContactSheetOpen(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <Card accentRule={accent.tint}>
            <View style={styles.providerRow}>
              <Avatar
                uri={provider.image}
                name={provider.name}
                size={48}
                tint={accent.tintSoft}
                color={accent.tint}
              />
              <View style={styles.providerInfo}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {provider.name}
                </Text>
                {/* Everything here is conditional: a provider with no ratings
                    yet, no recorded experience, or a job that has not started
                    should show less, never "★ 0" or an empty pill. */}
                <Text style={styles.meta} numberOfLines={1}>
                  {[
                    provider.specialty,
                    rating && provider.reviews > 0 ? `${rating} (${provider.reviews})` : null,
                    provider.experience,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {!!startedAtLabel && (
                  <Text style={styles.metaFaint}>Started {startedAtLabel}</Text>
                )}
              </View>
            </View>
          </Card>

          {/* The hero. Calm, legible, and the only thing on the screen with a
              vertical rhythm of its own. */}
          <View style={styles.section}>
            <SectionHeader title="Progress" />
            <Card style={styles.timelineCard}>
              {progressSteps?.map((step, index) => {
                const last = index === progressSteps.length - 1;
                return (
                  <View key={step.key} style={styles.step}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, step.completed && styles.stepDotDone]}>
                        {step.completed && (
                          <Ionicons name="checkmark" size={11} color={colors.inkInverse} />
                        )}
                      </View>
                      {!last && <View style={[styles.stepLine, step.completed && styles.stepLineDone]} />}
                    </View>
                    <Text style={[styles.stepLabel, step.completed && styles.stepLabelDone]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>

          {serviceStatus === 'checking' && (
            <View style={styles.section}>
              <Card>
                <Text style={styles.cardTitle}>Is the work finished?</Text>
                <Text style={styles.body}>
                  Confirm once {provider.name} has finished, and we'll move on to payment.
                </Text>
                {!!completeError && <Text style={styles.error}>{completeError}</Text>}
                <Button
                  label="Mark complete"
                  onPress={handleServiceCompleted}
                  loading={!!isSubmitting}
                  style={styles.cardButton}
                />
              </Card>
            </View>
          )}

          {paymentDue && (
            <View style={styles.section}>
              <Card elevation="raised">
                <View style={styles.completedRow}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <Text style={styles.completedTitle}>Service completed</Text>
                </View>
                <Text style={styles.body}>
                  {provider.name} finished the job
                  {completedAtLabel ? ` ${completedAtLabel}` : ''}. Settle up to close it out.
                </Text>
              </Card>

              <Card style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.cardTitle}>Payment</Text>
                  {!!serviceDetails?.invoiceId && (
                    <Text style={styles.invoice}>#{serviceDetails.invoiceId}</Text>
                  )}
                </View>

                {!!serviceDetails?.description && (
                  <Text style={styles.body}>{serviceDetails.description}</Text>
                )}

                <View style={styles.rows}>
                  <View style={styles.row}>
                    <Text style={styles.rowKey}>Provider</Text>
                    <Text style={styles.rowValue} numberOfLines={1}>
                      {provider.name}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowKey}>Service</Text>
                    <Text style={styles.rowValue}>{provider.service}</Text>
                  </View>
                  {!!serviceDetails?.estimatedDuration && (
                    <View style={styles.row}>
                      <Text style={styles.rowKey}>Duration</Text>
                      <Text style={styles.rowValue}>{serviceDetails.estimatedDuration}</Text>
                    </View>
                  )}
                  {!!completedAtLabel && (
                    <View style={styles.row}>
                      <Text style={styles.rowKey}>Completed</Text>
                      <Text style={styles.rowValue}>{completedAtLabel}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.amountLabel}>Amount agreed with {provider.name}</Text>
                <View style={styles.amountField}>
                  <Text style={styles.currency}>PKR</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={manualAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="number-pad"
                    accessibilityLabel="Payment amount"
                  />
                </View>

                {!!serviceDetails?.suggestedAmount && (
                  <TouchableOpacity
                    style={styles.suggested}
                    onPress={() => {
                      const amount = serviceDetails.suggestedAmount!;
                      setManualAmount(String(amount));
                      dispatch(setPaymentAmount(amount));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestedText}>
                      Use the quoted {formatAmount(serviceDetails.suggestedAmount)}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatAmount(payment?.amount)}</Text>
                </View>
              </Card>

              <Button
                label="Continue to payment"
                onPress={() =>
                  navigation.navigate('PaymentScreen', {
                    category,
                    bookingId,
                    paymentData: paymentSummary,
                  })
                }
                disabled={!amountEntered}
                style={styles.blockButton}
              />
              {!amountEntered && (
                <Text style={styles.hint}>Enter the agreed amount to continue.</Text>
              )}
              <Button
                label="Rate provider"
                variant="secondary"
                icon="star-outline"
                onPress={() => navigation.navigate('ReviewRating', { category, bookingId })}
                style={styles.stackedButton}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.support}
            onPress={() => contactSupport(bookingId ? `Booking ${bookingId}` : 'Service status')}
            activeOpacity={0.7}
          >
            <Text style={styles.supportText}>Something wrong with this job? Contact support</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.inkFaint} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ContactSheet
        visible={contactSheetOpen}
        onClose={() => setContactSheetOpen(false)}
        name={provider?.name || 'Provider'}
        image={provider?.image}
        subtitle={provider?.specialty || serviceDetails?.description}
        presence={counterpartPresence?.status ?? null}
        // Both of these used to pass a bare `{ bookingId }`, so the outgoing
        // call screen had no name to show and rendered the literal "Contact".
        onCall={() =>
          navigation.navigate('CallScreen', {
            bookingId,
            counterpartName: provider?.name,
            counterpartImage: provider?.image,
          })
        }
        onMessage={() =>
          navigation.navigate('ProviderChatScreen', {
            bookingId,
            counterpartName: provider?.name,
          })
        }
      />

      <ActionSheet
        visible={showLeaveSheet}
        title="Leave without paying?"
        message="The job is done. You can pay now, or come back to it from My bookings."
        cancelLabel="Stay here"
        onClose={() => setShowLeaveSheet(false)}
        options={[
          {
            label: 'Pay now',
            icon: 'card-outline',
            onPress: () =>
              navigation.navigate('PaymentScreen', {
                category,
                bookingId,
                paymentData: paymentSummary,
              }),
          },
          {
            label: 'Leave for now',
            icon: 'exit-outline',
            tone: 'destructive',
            onPress: leaveScreen,
          },
        ]}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: GUTTER,
    paddingBottom: S.huge,
  },
  loading: {
    padding: GUTTER,
  },
  loadingGap: { marginTop: SECTION },
  loadingGapSm: { marginTop: S.md },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: S.md,
  },
  providerName: {
    ...T.subhead,
    color: c.ink,
  },
  meta: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
  },
  metaFaint: {
    ...T.caption,
    color: c.inkFaint,
    marginTop: 2,
  },

  section: {
    marginTop: SECTION,
  },
  timelineCard: {
    marginTop: S.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepRail: {
    alignItems: 'center',
    width: 20,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  stepLine: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: c.line,
  },
  stepLineDone: {
    backgroundColor: c.accentLine,
  },
  stepLabel: {
    ...T.body,
    color: c.inkMuted,
    marginLeft: S.md,
    marginTop: -1,
  },
  stepLabelDone: {
    color: c.ink,
    fontFamily: F.semibold,
  },

  cardTitle: {
    ...T.subhead,
    color: c.ink,
  },
  body: {
    ...T.body,
    color: c.inkMuted,
    marginTop: S.xs,
    maxWidth: PROSE_WIDTH,
  },
  cardButton: {
    marginTop: S.lg,
  },
  error: {
    ...T.caption,
    color: c.error,
    marginTop: S.md,
  },

  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedTitle: {
    ...T.heading,
    color: c.ink,
    marginLeft: S.sm,
  },

  paymentCard: {
    marginTop: S.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoice: {
    ...T.caption,
    color: c.inkFaint,
  },
  rows: {
    marginTop: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  rowKey: {
    ...T.body,
    color: c.inkMuted,
  },
  rowValue: {
    ...T.bodyStrong,
    color: c.ink,
    marginLeft: S.lg,
    flexShrink: 1,
    textAlign: 'right',
  },

  amountLabel: {
    ...T.label,
    color: c.inkMuted,
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: S.md,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
  currency: {
    ...T.bodyStrong,
    color: c.inkMuted,
    marginRight: S.sm,
  },
  amountInput: {
    flex: 1,
    ...T.heading,
    color: c.ink,
    padding: 0,
  },
  suggested: {
    alignSelf: 'flex-start',
    marginTop: S.md,
  },
  suggestedText: {
    ...T.label,
    color: c.accentDeep,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.xl,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  totalLabel: {
    ...T.subhead,
    color: c.ink,
  },
  totalValue: {
    ...T.heading,
    color: c.ink,
  },

  blockButton: {
    marginTop: S.lg,
  },
  stackedButton: {
    marginTop: S.md,
  },
  hint: {
    ...T.caption,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: S.sm,
  },

  support: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SECTION,
  },
  supportText: {
    ...T.caption,
    color: c.inkFaint,
    marginRight: 4,
  },
});
