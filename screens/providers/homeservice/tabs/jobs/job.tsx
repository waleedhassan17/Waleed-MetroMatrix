import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getSocket } from '../../../../../services/socket/socketClient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../../store/store';
import {
  acceptJob,
  rejectJob,
  selectFilteredJobs,
  selectJobsStats,
  setFilter,
  fetchJobs,
  JobStatus,
  Job,
} from './jobSlice';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { F, R, S, T, type Tone } from '../../../../../constants/theme';
import { categoryAccent } from '../../../../../constants/HomeServiceTheme';
import { formatPrice } from '../../../../../utils/homeservice/format';
import { ThemeColors, useTheme } from '../../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../../providerTheme';
import {
  ActionSheet,
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  Screen,
  SkeletonCard,
  ToneBadge,
} from '../../../../../components/ui';

// Design System - Matching reference design

// Status configurations matching reference colors
// Status -> label, tone and glyph. Tone only: ToneBadge resolves the actual
// colours from the live ramp, so this no longer has to be a function of `c`
// and no longer duplicates the soft-ground pairs that constants/theme.ts owns.
// Labels are sentence case, matching bookingStatus() in HomeServiceTheme.ts.
const JOB_STATUS: Record<string, { label: string; tone: Tone; icon: string }> = {
  upcoming: { label: 'Upcoming', tone: 'warning', icon: 'alert-circle-outline' },
  active: { label: 'In progress', tone: 'info', icon: 'time-outline' },
  completed: { label: 'Completed', tone: 'success', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', tone: 'error', icon: 'close-circle-outline' },
  available: { label: 'Available', tone: 'success', icon: 'calendar-outline' },
  // Was a purple that exists in no palette. 'Available' already owns success,
  // so 'Today' takes info — the remaining semantic slot, not a new hue.
  today: { label: 'Today', tone: 'info', icon: 'calendar-outline' },
};

const HIT = { top: 6, bottom: 6, left: 6, right: 6 };

// ── Job card ────────────────────────────────────────────────────────────────
// Hoisted to module scope and memoised. This used to be declared INSIDE the
// screen's render body with its own useRef/useEffect, which creates a NEW
// component type on every render: React cannot match it against the previous
// tree, so it unmounted and remounted every row — replaying a 400ms entrance
// animation and dropping scroll position whenever any state on the screen
// changed. The animation is gone for the same reason the customer's Bookings
// list removed it (tabs/booking-screen/booking.tsx): a list that re-animates
// on every change reads as jitter, not polish.
//
// The shape deliberately mirrors the customer's BookingCard — same Card, same
// accent rule, same avatar / status / meta / footer order — because "the
// provider side looks like a different app" is the thing being fixed. The
// category thumbnail is gone with the Unsplash map that fed it: a category is
// identity, not decoration, and it earns a 3px rule and a tinted glyph
// (constants/HomeServiceTheme.ts).
interface JobCardProps {
  job: Job;
  onCall: (job: Job) => void;
  onMessage: (job: Job) => void;
  onDecide: (job: Job, action: 'accept' | 'reject') => void;
}

const JobCard = React.memo(function JobCard({ job, onCall, onMessage, onDecide }: JobCardProps) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeCardStyles(colors), [colors]);
  const category = categoryAccent(job.category, mode);
  const status = JOB_STATUS[job.status] ?? JOB_STATUS.available;
  const contactable = job.status === 'active' || job.status === 'upcoming';
  const rating = job.customer.rating;

  return (
    <Card elevation="raised" accentRule={category.tint} style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {job.title}
        </Text>
        <ToneBadge label={status.label} tone={status.tone} icon={status.icon} />
      </View>

      <View style={styles.customerRow}>
        <Avatar
          uri={job.customer.avatar || undefined}
          name={job.customer.name}
          size={28}
          tint={category.tintSoft}
          color={category.tint}
        />
        <Text style={styles.customerName} numberOfLines={1}>
          {job.customer.name}
        </Text>

        {contactable && (
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => onCall(job)}
              hitSlop={HIT}
              accessibilityRole="button"
              accessibilityLabel={`Call ${job.customer.name}`}
            >
              <Ionicons name="call-outline" size={16} color={colors.accentDeep} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => onMessage(job)}
              hitSlop={HIT}
              accessibilityRole="button"
              accessibilityLabel={`Message ${job.customer.name}`}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.accentDeep} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.inkFaint} />
        <Text style={styles.metaText} numberOfLines={1}>
          {[job.schedule.date, job.schedule.time].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color={colors.inkFaint} />
        <Text style={styles.metaText} numberOfLines={1}>
          {[job.location.address, job.location.city].filter(Boolean).join(', ')}
        </Text>
      </View>

      <View style={styles.footer}>
        {/* A job is priced on completion, so zero means "not yet quoted" —
            formatPrice says that rather than printing PKR 0. */}
        <Text style={styles.price}>{formatPrice(job.pricing.amount)}</Text>
        {job.status === 'completed' && typeof rating === 'number' ? (
          <View style={styles.ratedRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.ratedText}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {/* A request the customer is waiting on. Full width under the price
          rather than squeezed beside it: these are the two most consequential
          taps on the screen, and Decline is terminal. */}
      {job.status === 'available' && (
        <View style={styles.decisionRow}>
          <Button
            label="Decline"
            variant="destructive"
            size="sm"
            icon="close-circle-outline"
            fullWidth={false}
            onPress={() => onDecide(job, 'reject')}
            style={styles.decisionButton}
          />
          <Button
            label="Accept"
            size="sm"
            icon="checkmark-circle-outline"
            fullWidth={false}
            onPress={() => onDecide(job, 'accept')}
            style={styles.decisionButton}
          />
        </View>
      )}
    </Card>
  );
});

const makeCardStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { marginBottom: S.md },
    top: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    title: { ...T.subhead, color: c.ink, flex: 1 },
    customerRow: { flexDirection: 'row', alignItems: 'center', marginTop: S.md, gap: S.sm },
    customerName: { ...T.body, color: c.inkMuted, flex: 1 },
    contactRow: { flexDirection: 'row', gap: S.sm },
    contactButton: {
      width: 32,
      height: 32,
      borderRadius: R.control,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs + 2, marginTop: S.xs + 2 },
    metaText: { ...T.caption, color: c.inkMuted, flex: 1 },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: S.md,
      paddingTop: S.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.lineSoft,
    },
    price: { ...T.bodyStrong, color: c.ink },
    ratedRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
    ratedText: { ...T.caption, color: c.inkMuted },
    decisionRow: { flexDirection: 'row', gap: S.sm, marginTop: S.md },
    decisionButton: { flex: 1, alignSelf: 'stretch' },
  });

const JobsScreen: React.FC = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const filteredJobs = useAppSelector(selectFilteredJobs);
  const stats = useAppSelector(selectJobsStats);
  const { loading, currentFilter } = useAppSelector((state: RootState) => state.jobs);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Filter options matching reference design
  const filterOptions = useMemo(
    () => [
      { key: 'all' as any, label: 'All', count: stats.total },
      // Named for what it asks of the provider rather than for the bucket it
      // arrives in. A request nobody answers is a booking the customer
      // eventually gives up on.
      { key: 'available' as JobStatus, label: 'New requests', count: stats.available },
      { key: 'upcoming' as JobStatus, label: 'Upcoming', count: stats.upcoming },
      { key: 'active' as any, label: 'Active', count: stats.today },
    ],
    [stats]
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Refetch on every focus. This was a mount-only fetch, and because the tab
  // navigator keeps the screen mounted, the list was loaded once per app
  // session — a provider switching back to this tab saw whatever was true when
  // they first opened it.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchJobs());
    }, [dispatch])
  );

  // And live, while the tab is open. `booking_created` is addressed to the
  // provider personally — they are not in the new booking's room yet — so this
  // binds the raw socket rather than useRoomSocket. Same shape as the
  // dashboard's listener: mounted guard, null-check, off-before-on so a
  // reconnect cannot stack handlers, and rebind on 'connect'.
  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | undefined;

    const onBookingCreated = () => {
      if (!mounted) return;
      dispatch(fetchJobs());
    };

    const bind = async () => {
      const s = await getSocket();
      if (!mounted || !s) return;
      s.off('booking_created', onBookingCreated);
      s.on('booking_created', onBookingCreated);
      s.on('connect', bind);
      detach = () => {
        s.off('booking_created', onBookingCreated);
        s.off('connect', bind);
      };
    };

    bind();
    return () => {
      mounted = false;
      detach?.();
    };
  }, [dispatch]);

  // Stable identities so the memoised JobCard does not re-render the whole
  // list whenever this screen's state changes. `job.id` is the booking id.
  const handleCall = useCallback(
    (job: Job) =>
      navigation.navigate('ProviderCallScreen', {
        bookingId: job.id,
        customerName: job.customer.name,
        customerImage: job.customer.avatar || undefined,
      }),
    [navigation]
  );

  const handleMessage = useCallback(
    (job: Job) =>
      navigation.navigate('ProviderJobChat', {
        bookingId: job.id,
        customerName: job.customer.name,
      }),
    [navigation]
  );

  const handleDecide = useCallback(
    (job: Job, action: 'accept' | 'reject') => setPendingDecision({ job, action }),
    []
  );

  const handleFilterPress = useCallback(
    (filterKey: JobStatus | 'all') => {
      dispatch(setFilter(filterKey));
    },
    [dispatch]
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    dispatch(fetchJobs()).finally(() => setIsRefreshing(false));
  }, [dispatch]);

  // ── Answering a request ───────────────────────────────────────────────────
  //
  // A PENDING booking arrives here in the 'available' bucket, and this list is
  // where a provider goes to look at their work — but the cards offered no way
  // to answer one. Accepting was reachable only from the dashboard's
  // "Available" tab, which is a different screen behind a second tab, so a
  // customer's request could sit unanswered in plain sight.
  //
  // The thunks were already here and already correct; they had no button.
  const [pendingDecision, setPendingDecision] = useState<{
    job: Job;
    action: 'accept' | 'reject';
  } | null>(null);

  const handleDecision = useCallback(async () => {
    if (!pendingDecision) return;
    const { job, action } = pendingDecision;
    setPendingDecision(null);

    // Dispatched on separate lines deliberately: a union of two different
    // AsyncThunkActions is not assignable to dispatch's overloads.
    const result: any =
      action === 'accept'
        ? await dispatch(acceptJob(job.id))
        : await dispatch(rejectJob(job.id));
    if (result?.meta?.requestStatus === 'rejected') {
      Alert.alert(
        action === 'accept' ? 'Could not accept this job' : 'Could not decline this job',
        (result.payload as string) || 'Please check your connection and try again.'
      );
      return;
    }
    // The bucket a job lands in after acceptance is the SERVER's call — 'today'
    // or 'upcoming' depending on the schedule — so re-read rather than trust
    // the optimistic 'upcoming' the reducer sets.
    dispatch(fetchJobs());
  }, [dispatch, pendingDecision]);

  return (
    <Screen>
      {/* These two strings were copied verbatim from the CUSTOMER bookings
          screen. A provider does not have bookings — they have jobs, and they
          are not "managing appointments", they are working them. */}
      <AppBar
        title="Jobs"
        subtitle="Today's work and new requests"
        hideBack
        right={
          <TouchableOpacity style={styles.filterButton} accessibilityRole="button">
            <Ionicons name="options-outline" size={20} color={colors.inkInverse} />
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs - Matching reference design */}
      <View style={styles.filterContainer}>
        {filterOptions.map((option) => {
          const isSelected = currentFilter === option.key;
          
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterTab,
                isSelected && styles.filterTabActive,
              ]}
              onPress={() => handleFilterPress(option.key)}
              activeOpacity={0.7}
            >
              {isSelected && option.key === 'all' && (
                <View style={styles.filterIcon}>
                  <Ionicons name="funnel-outline" size={14} color={theme.colors.text.inverse} />
                </View>
              )}
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextActive,
                ]}
              >
                {option.label}
              </Text>
              <View style={[
                styles.filterCount,
                isSelected && styles.filterCountActive,
              ]}>
                <Text style={[
                  styles.filterCountText,
                  isSelected && styles.filterCountTextActive,
                ]}>
                  {option.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Jobs Count & Sort */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
        </Text>
        {/* Sorting is not built. Dimmed and disabled rather than
            tappable-but-inert, which is what the customer screen already
            does with its own Sort control. */}
        <TouchableOpacity style={[styles.sortButton, styles.controlDisabled]} disabled>
          <Ionicons name="funnel-outline" size={16} color={theme.colors.text.tertiary} />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Skeletons rather than a spinner, and only on a cold load: they hold
            the shape the rows will take, so nothing jumps when the data lands.
            An ActivityIndicator over "Loading bookings..." also said the wrong
            noun — a provider has jobs, not bookings. */}
        {loading && filteredJobs.length === 0 ? (
          <View accessibilityLabel="Loading jobs">
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonCard lines={2} />
              </View>
            ))}
          </View>
        ) : filteredJobs.length === 0 ? (
          // Same distinction the customer's Bookings tab makes: an empty
          // filter is not an empty account, and telling someone their work
          // will "appear here" when it is one tap away under All is wrong.
          currentFilter && currentFilter !== 'all' ? (
            <EmptyState
              icon="funnel-outline"
              title="Nothing under this filter"
              message="The rest of your jobs are under another filter."
              actionLabel="Show all jobs"
              onAction={() => handleFilterPress('all' as any)}
            />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No jobs yet"
              message="New requests land here as soon as a customer books you."
            />
          )
        ) : (
          filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onCall={handleCall}
              onMessage={handleMessage}
              onDecide={handleDecide}
            />
          ))
        )}

      </ScrollView>

      {/* Same confirm-then-act shape the dashboard uses for these two
          actions, so answering a request feels identical wherever the
          provider happens to be standing. */}
      <ActionSheet
        visible={!!pendingDecision}
        title={
          pendingDecision?.action === 'accept'
            ? `Accept ${pendingDecision?.job.title}?`
            : `Decline ${pendingDecision?.job.title}?`
        }
        message={
          pendingDecision?.action === 'accept'
            ? `${pendingDecision?.job.customer.name} will be told you're taking this job.`
            : 'This cannot be undone — the request goes back to other providers.'
        }
        cancelLabel="Not now"
        onClose={() => setPendingDecision(null)}
        options={[
          {
            label: pendingDecision?.action === 'accept' ? 'Accept job' : 'Decline job',
            icon:
              pendingDecision?.action === 'accept'
                ? 'checkmark-circle-outline'
                : 'close-circle-outline',
            tone: pendingDecision?.action === 'reject' ? 'destructive' : 'default',
            onPress: handleDecision,
          },
        ]}
      />
    </Screen>
  );
};

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  // Cold-load placeholders share the card rhythm so nothing shifts.
  skeletonRow: { marginBottom: S.md },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterIcon: {
    marginRight: 2,
  },
  filterText: {
    ...T.body,
    fontFamily: F.medium,
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: theme.colors.text.inverse,
    fontFamily: F.semibold,
  },
  filterCount: {
    backgroundColor: c.surfaceSunken,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    ...T.caption,
    fontFamily: F.semibold,
    color: theme.colors.text.secondary,
  },
  filterCountTextActive: {
    color: theme.colors.text.inverse,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  resultsText: {
    ...T.body,
    fontFamily: F.medium,

    color: theme.colors.text.secondary,
  },
  controlDisabled: {
    opacity: 0.45,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    ...T.body,
    fontFamily: F.medium,

    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});

export default JobsScreen;