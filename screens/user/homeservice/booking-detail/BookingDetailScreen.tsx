// ============================================================================
// Booking detail — status timeline from statusHistory, price/payment
// breakdown, and the contextual actions (cancel / chat / track / pay / review /
// raise dispute).
//
// This screen used a third palette (indigo #4F46E5) that appears nowhere else
// in home services, seven differently-coloured action chips, raw
// SCREAMING_SNAKE statuses ("EN_ROUTE"), a literal "★ 0" beside every unrated
// provider, and `toLocaleString()` timestamps. All of that is now tokens,
// `bookingStatus()` labels and the shared formatters.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  ActionSheet,
  AppBar,
  Avatar,
  Card,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
  StatusPill,
} from '../../../../components/ui';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, R, S, SECTION, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { fetchBookingDetail } from '../../../../networks/serviceProviders/adminHomeServiceApi';
import { cancelBooking } from '../../../../networks/serviceProviders/bookingNetwork';
import { isCallingSupported } from '../../../../services/call/usePeerConnection';
import {
  formatAmount,
  formatBookingWhen,
  formatInstant,
  formatRating,
} from '../../../../utils/homeservice/format';

type Params = { bookingId: string };

const CANCELLABLE = ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'];
const TRACKABLE = ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const CONTACTABLE_EXCLUDED = ['PENDING', 'REJECTED', 'CANCELLED'];

// The detail endpoint speaks SCREAMING_SNAKE; `bookingStatus()` speaks the
// booking vocabulary the rest of the module uses. One place to bridge them.
const toStatusKey = (status?: string) => (status || '').toLowerCase();

const humaniseStatus = (status?: string) =>
  (status || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

export default function BookingDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId } = route.params || ({} as Params);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchBookingDetail(bookingId);
    if (res.success) setData(res.data);
    else setError(res.message || 'Failed to load booking');
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const doCancel = useCallback(async () => {
    setCancelError(null);
    const res = await cancelBooking(bookingId, 'Cancelled from booking detail');
    if (res.success) load();
    else setCancelError(res.message || "We couldn't cancel this booking. Try again.");
  }, [bookingId, load]);

  const status = data?.canonicalStatus as string | undefined;
  const paid = data?.payment?.status === 'paid';
  // Cached after the first call — a native module cannot appear at runtime.
  const callingSupported = isCallingSupported();
  const contactable = !!status && !CONTACTABLE_EXCLUDED.includes(status);

  const actions = data
    ? [
        TRACKABLE.includes(status || '') && {
          icon: 'navigate-outline',
          label: 'Track',
          onPress: () => navigation.navigate('liveTracking', { bookingId }),
        },
        contactable && {
          icon: 'chatbubble-outline',
          label: 'Message',
          onPress: () =>
            navigation.navigate('ProviderChatScreen', { bookingId, provider: data.provider }),
        },
        // Same gate as Message: only once the booking is live, since that is
        // the room the realtime service authorizes both parties against. Also
        // hidden outright where react-native-webrtc is not linked, so the call
        // would ring and die.
        callingSupported &&
          contactable && {
            icon: 'call-outline',
            label: 'Call',
            onPress: () =>
              navigation.navigate('CallScreen', {
                bookingId,
                provider: data.provider,
                counterpartName: data.provider?.name,
              }),
          },
        status === 'COMPLETED' &&
          !paid && {
            icon: 'wallet-outline',
            label: 'Pay',
            onPress: () => navigation.navigate('PaymentScreen', { bookingId }),
          },
        status === 'COMPLETED' &&
          paid &&
          !data.review && {
            icon: 'star-outline',
            label: 'Review',
            onPress: () => navigation.navigate('ReviewRating', { bookingId }),
          },
        status === 'COMPLETED' && {
          icon: 'alert-circle-outline',
          label: 'Dispute',
          onPress: () => navigation.navigate('RaiseDispute', { bookingId }),
        },
        CANCELLABLE.includes(status || '') && {
          icon: 'close-circle-outline',
          label: 'Cancel',
          destructive: true,
          onPress: () => setShowCancelSheet(true),
        },
      ].filter(Boolean as any as (v: any) => v is { icon: string; label: string; destructive?: boolean; onPress: () => void })
    : [];

  const rating = formatRating(data?.provider?.rating);

  return (
    <Screen>
      <AppBar title="Booking" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loading} accessibilityLabel="Loading booking">
          <Skeleton width="100%" height={120} radius={R.card} />
          <Skeleton width="40%" height={16} style={styles.loadingGap} />
          <Skeleton width="100%" height={160} radius={R.card} style={styles.loadingGapSm} />
        </View>
      ) : error || !data ? (
        <ErrorState
          title="We couldn't load this booking"
          message={error || 'It may have been removed.'}
          onRetry={load}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card>
            <View style={styles.providerRow}>
              <Avatar uri={data.provider?.image} name={data.provider?.name} size={48} />
              <View style={styles.providerInfo}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {data.provider?.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {/* "★ 0" used to appear for every provider without reviews. */}
                  {[data.bookingDetails?.service, rating ? `${rating} rating` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <StatusPill status={toStatusKey(status)} size="sm" />
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.inkFaint} />
                <Text style={styles.detailText}>
                  {formatBookingWhen(
                    data.bookingDetails?.selectedDate,
                    data.bookingDetails?.selectedTime
                  )}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={15} color={colors.inkFaint} />
                <Text style={styles.detailText}>
                  {data.bookingDetails?.selectedAddress?.address || 'No address on file'}
                </Text>
              </View>
              {!!data.bookingDetails?.instructions && (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={15} color={colors.inkFaint} />
                  <Text style={styles.detailText}>{data.bookingDetails.instructions}</Text>
                </View>
              )}
            </View>
          </Card>

          {actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.action}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <View style={[styles.actionIcon, action.destructive && styles.actionIconDanger]}>
                    <Ionicons
                      name={action.icon as any}
                      size={19}
                      color={action.destructive ? colors.error : colors.ink}
                    />
                  </View>
                  <Text style={[styles.actionLabel, action.destructive && styles.actionLabelDanger]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!!cancelError && <Text style={styles.error}>{cancelError}</Text>}

          <SectionHeader title="Progress" style={styles.sectionHeader} />
          <Card>
            {(data.statusHistory || []).map((h: any, i: number) => {
              const last = i === (data.statusHistory?.length ?? 0) - 1;
              const when = formatInstant(h.changedAt);
              return (
                <View key={`${h.status}-${i}`} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, last && styles.timelineDotCurrent]} />
                    {!last && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineStatus}>{humaniseStatus(h.status)}</Text>
                    <Text style={styles.meta}>
                      {[when, h.role].filter(Boolean).join(' · ')}
                    </Text>
                    {!!h.note && <Text style={styles.timelineNote}>{h.note}</Text>}
                  </View>
                </View>
              );
            })}
          </Card>

          <SectionHeader title="Payment" style={styles.sectionHeader} />
          <Card>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Amount</Text>
              <Text style={styles.payValue}>{formatAmount(data.payment?.amount)}</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Status</Text>
              <Text style={[styles.payValue, { color: paid ? colors.success : colors.warning }]}>
                {humaniseStatus(data.payment?.status) || 'Not settled'}
              </Text>
            </View>
            {!!data.payment?.method && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Method</Text>
                <Text style={styles.payValue}>{humaniseStatus(data.payment.method)}</Text>
              </View>
            )}
          </Card>
        </ScrollView>
      )}

      <ActionSheet
        visible={showCancelSheet}
        title="Cancel this booking?"
        message="The provider will be told, and you'll need to book again if you change your mind."
        cancelLabel="Keep booking"
        onClose={() => setShowCancelSheet(false)}
        options={[
          {
            label: 'Cancel booking',
            icon: 'close-circle-outline',
            tone: 'destructive',
            onPress: doCancel,
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
  },

  details: {
    marginTop: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.sm,
  },
  detailText: {
    ...T.body,
    color: c.inkMuted,
    marginLeft: S.sm,
    flex: 1,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.lg,
  },
  action: {
    alignItems: 'center',
    width: '25%',
    marginBottom: S.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: R.control,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: {
    backgroundColor: c.errorSoft,
    borderColor: 'transparent',
  },
  actionLabel: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 5,
  },
  actionLabelDanger: {
    color: c.error,
  },
  error: {
    ...T.caption,
    color: c.error,
    marginTop: S.sm,
  },

  sectionHeader: {
    marginTop: SECTION,
    marginBottom: S.md,
  },

  timelineRow: {
    flexDirection: 'row',
  },
  timelineRail: {
    alignItems: 'center',
    width: 18,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    backgroundColor: c.disabled,
  },
  timelineDotCurrent: {
    backgroundColor: c.accent,
  },
  timelineLine: {
    flex: 1,
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.line,
    marginVertical: 3,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: S.lg,
    marginLeft: S.md,
  },
  timelineStatus: {
    ...T.bodyStrong,
    color: c.ink,
  },
  timelineNote: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: S.xs,
  },

  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  payLabel: {
    ...T.body,
    color: c.inkMuted,
  },
  payValue: {
    ...T.bodyStrong,
    color: c.ink,
  },
});
