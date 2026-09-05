// ============================================================================
// Provider dashboard
//
// The operator's home screen. It reads as the same product as the customer
// side now — same tokens, same header, same card shape, same status pills —
// because a super-app that changes design language between roles looks like two
// apps stitched together.
//
// What changed: the gradient stat card is flat (numbers lead, not the ground
// they sit on), the bell and speech-bubble emoji are real icons, the insight
// carousel is a legible two-column grid, the accept/decline alerts are sheets,
// and every control that used to render without an `onPress` either does
// something now or is no longer a button.
//
// The activity feed also stops drawing a checkmark for every event type, and
// the performance tiles stop drawing an up-arrow for a downward trend.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MiniWalletCard from '../../../../../components/MiniWalletCard/MiniWalletCard';
import {
  ActionSheet,
  Avatar,
  Card,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusPill,
} from '../../../../../components/ui';
import { HS } from '../../../../../constants/HomeServiceTheme';
import { C, F, GUTTER, R, S, SECTION, T } from '../../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../../providerTheme';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import { getSocket } from '../../../../../services/socket/socketClient';
import type { RootState } from '../../../../../store/store';
import { selectTotalUnread } from '../../../../../store/unreadSlice';
import { formatPrice } from '../../../../../utils/homeservice/format';
import { JobData, setJobDetail } from '../../jobdetail-screen/jobDetailSlice';
import { fetchProfile } from '../../profile-screen/profileSlice';
import {
  acceptJob,
  fetchDashboardData,
  refreshDashboard,
  rejectJob,
  setActiveTab,
} from './dashboardSlice';
import type {
  DashboardInsight,
  DashboardJobLocal,
  DashboardProfile,
  DashboardStats,
  RecentActivity,
} from './dashboardSlice';

type RootStackParamList = {
  JobDetail: { job?: JobData };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// The feed used to draw a checkmark for every event, so a cancellation and a
// completion looked identical at a glance.
const ACTIVITY_ICONS: Record<string, string> = {
  completed: 'checkmark-done-outline',
  accepted: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
  cancelled: 'close-circle-outline',
  payment: 'wallet-outline',
  paid: 'wallet-outline',
  review: 'star-outline',
  rating: 'star-outline',
  booking: 'calendar-outline',
  created: 'calendar-outline',
  message: 'chatbubble-outline',
};

const activityIcon = (type?: string) => {
  const key = (type || '').toLowerCase();
  const match = Object.keys(ACTIVITY_ICONS).find((k) => key.includes(k));
  return match ? ACTIVITY_ICONS[match] : 'ellipse-outline';
};

// ---------------------------------------------------------------------------
// Sections live at module scope on purpose. When they were declared inside
// Dashboard, every render produced new component identities, so React
// unmounted and remounted each subtree — which, combined with the native-driver
// fade that used to wrap them, left them stuck at opacity 0 (the "blank screen
// under the wallet card" bug). The fade is gone now; keep these out here
// anyway, because remounting a whole feed on every data change is wasteful.
// ---------------------------------------------------------------------------

const Header: React.FC<{
  profile: DashboardProfile;
  insetTop: number;
  /** Passed in rather than taken from useNavigation here, so this component can
   *  stay at module scope. */
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}> = ({ profile, insetTop, onOpenNotifications, onOpenProfile }) => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const credentials = [
    profile.rating > 0 ? profile.rating.toFixed(1) : null,
    profile.isPro ? 'Pro' : null,
  ].filter(Boolean);

  return (
    <View style={[styles.header, { paddingTop: Math.max(insetTop, S.lg) }]}>
      <TouchableOpacity
        onPress={onOpenProfile}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Open your profile"
      >
        <Avatar
          uri={profile.avatar}
          name={profile.name}
          size={46}
          tint={colors.accentSoft}
          color={colors.accentDeep}
        />
        {profile.isOnline && <View style={styles.onlineDot} />}
      </TouchableOpacity>

      <View style={styles.headerInfo}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.userName} numberOfLines={1}>
          {profile.name || 'Provider'}
        </Text>
        {credentials.length > 0 && (
          <View style={styles.credentials}>
            {profile.rating > 0 && <Ionicons name="star" size={11} color={colors.star} />}
            <Text style={styles.credentialsText}>{credentials.join(' · ')}</Text>
          </View>
        )}
      </View>

      {/* This bell had no onPress at all — it rendered, showed a badge, and did
          nothing when tapped. The badge was also the count of PENDING BOOKINGS
          under a notifications label, so it could never be cleared by reading
          anything; the server now returns a real unread count. */}
      <TouchableOpacity
        style={styles.bell}
        onPress={onOpenNotifications}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={21} color={colors.inkInverse} />
        {(profile.unreadNotifications ?? 0) > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {(profile.unreadNotifications ?? 0) > 9 ? '9+' : profile.unreadNotifications}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const StatsCard: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);

  return (
  <Card style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Ionicons name="briefcase-outline" size={17} color={colors.accentDeep} />
        <Text style={styles.statValue}>{stats.todayJobs}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Ionicons name="calendar-outline" size={17} color={colors.accentDeep} />
        <Text style={styles.statValue}>{stats.weekJobs}</Text>
        <Text style={styles.statLabel}>This week</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Ionicons name="checkmark-done-outline" size={17} color={colors.accentDeep} />
        <Text style={styles.statValue}>{stats.completionRate}%</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
    </View>
  </Card>
  );
};

const PerformanceSection: React.FC<{ insights: DashboardInsight[] }> = ({ insights }) => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  if (!insights.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Performance" />
      <View style={styles.insightGrid}>
        {insights.map((insight) => {
          const down = insight.trend === 'down';
          return (
            <View key={insight.id} style={styles.insightCell}>
              <Card style={styles.insightCard}>
                <Text style={styles.insightValue}>{insight.value}</Text>
                <Text style={styles.insightTitle} numberOfLines={1}>
                  {insight.title}
                </Text>
                <View style={styles.insightTrend}>
                  {/* Both directions used to render TrendingUp, recoloured —
                      so a falling metric showed a rising arrow. */}
                  <Ionicons
                    name={down ? 'trending-down' : 'trending-up'}
                    size={13}
                    color={down ? colors.error : colors.success}
                  />
                  {!!insight.subtitle && (
                    <Text style={styles.insightSubtitle} numberOfLines={1}>
                      {insight.subtitle}
                    </Text>
                  )}
                </View>
              </Card>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface JobsSectionProps {
  jobs: { today: DashboardJobLocal[]; available: DashboardJobLocal[] };
  activeTab: 'today' | 'available';
  onSelectTab: (tab: 'today' | 'available') => void;
  onAccept: (job: DashboardJobLocal) => void;
  onReject: (job: DashboardJobLocal) => void;
  onNavigateToJob: (job: DashboardJobLocal) => void;
  onMessage: (job: DashboardJobLocal) => void;
}

const JobsSection: React.FC<JobsSectionProps> = ({
  jobs,
  activeTab,
  onSelectTab,
  onAccept,
  onReject,
  onNavigateToJob,
  onMessage,
}) => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const currentJobs = activeTab === 'today' ? jobs.today : jobs.available;

  return (
    <View style={styles.section}>
      <SectionHeader title="Jobs" />

      <View style={styles.tabs}>
        <Chip
          label="Today"
          count={jobs.today.length}
          selected={activeTab === 'today'}
          onPress={() => onSelectTab('today')}
          style={styles.tabChip}
        />
        <Chip
          label="Available"
          count={jobs.available.length}
          selected={activeTab === 'available'}
          onPress={() => onSelectTab('available')}
        />
      </View>

      {currentJobs.length > 0 ? (
        currentJobs.map((job) => (
          // The same card shape the customer's booking list uses, so both
          // sides of the marketplace read as one app.
          <Card
            key={job.id}
            accentRule={activeTab === 'today' ? colors.accent : colors.info}
            style={styles.jobCard}
          >
            <View style={styles.jobTop}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {job.title}
              </Text>
              {!!job.price && <Text style={styles.jobPrice}>{formatPrice(job.price)}</Text>}
            </View>

            <Text style={styles.jobCustomer} numberOfLines={1}>
              {job.customer}
            </Text>

            <Text style={styles.jobMeta} numberOfLines={1}>
              {[
                job.time || 'Time to be confirmed',
                (job.location || 'Location unavailable').split(',')[0],
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            <View style={styles.jobActions}>
              {activeTab === 'today' ? (
                <>
                  <TouchableOpacity
                    style={styles.jobSecondary}
                    onPress={() => onMessage(job)}
                    accessibilityLabel={`Message ${job.customer}`}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color={colors.ink} />
                    <Text style={styles.jobSecondaryText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.jobPrimary}
                    onPress={() => onNavigateToJob(job)}
                    accessibilityLabel={`Open ${job.title}`}
                  >
                    <Ionicons name="navigate-outline" size={15} color={colors.inkInverse} />
                    <Text style={styles.jobPrimaryText}>Navigate</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.jobDecline}
                    onPress={() => onReject(job)}
                    accessibilityLabel={`Decline ${job.title}`}
                  >
                    <Text style={styles.jobDeclineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.jobPrimary}
                    onPress={() => onAccept(job)}
                    accessibilityLabel={`Accept ${job.title}`}
                  >
                    <Text style={styles.jobPrimaryText}>Accept</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Card>
        ))
      ) : (
        <EmptyState
          icon="briefcase-outline"
          title={activeTab === 'today' ? 'Nothing booked today' : 'No open jobs right now'}
          message={
            activeTab === 'today'
              ? 'Your schedule is clear. New requests will show under Available.'
              : 'Requests near you appear here as customers post them.'
          }
        />
      )}
    </View>
  );
};

const ActivitySection: React.FC<{ recentActivity: RecentActivity[] }> = ({ recentActivity }) => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  if (!recentActivity.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Recent activity" />

      <Card>
        {recentActivity.map((activity, index) => {
          // `mapDashboardData` only carries id/type/message/time across, so
          // title/description are frequently undefined here.
          const title = activity.title || activity.message || 'Activity';
          const description = activity.title
            ? activity.description || activity.message
            : activity.description;

          return (
            <View
              key={activity.id}
              style={[styles.activityRow, index > 0 && styles.activityDivider]}
            >
              <View style={styles.activityIcon}>
                <Ionicons name={activityIcon(activity.type) as any} size={17} color={colors.inkMuted} />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  {title}
                </Text>
                {!!description && (
                  <Text style={styles.activityDesc} numberOfLines={1}>
                    {description}
                  </Text>
                )}
                {!!activity.time && <Text style={styles.activityTime}>{activity.time}</Text>}
              </View>
              {!!activity.status && <StatusPill status={activity.status} size="sm" hideIcon />}
            </View>
          );
        })}
      </Card>
    </View>
  );
};

export default function Dashboard() {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const unreadTotal = useAppSelector(selectTotalUnread);
  const { profile, stats, insights, jobs, recentActivity, activeTab, loading, error } =
    useAppSelector((state: RootState) => state.dashboard);

  // ONE identity source for the provider shell.
  //
  // Home read `state.dashboard.profile` (GET /provider/dashboard) while the
  // Profile screen read `state.profile` (GET /provider/profile). Two payloads,
  // two fetch times, no shared reset — so whichever was stale showed the wrong
  // provider. /provider/profile is canonical; the dashboard payload only fills
  // in while it is still loading.
  const canonicalProfile = useAppSelector((state: RootState) => state.profile.provider);

  const identity = useMemo(
    () => ({
      ...profile,
      name: canonicalProfile.name || profile.name,
      avatar: canonicalProfile.profileImage ?? profile.avatar,
      rating: canonicalProfile.rating || profile.rating,
    }),
    [profile, canonicalProfile]
  );

  const [refreshing, setRefreshing] = useState(false);
  const [pendingJob, setPendingJob] = useState<{
    job: DashboardJobLocal;
    action: 'accept' | 'reject';
  } | null>(null);

  useEffect(() => {
    dispatch(fetchDashboardData());
    // The provider shell's canonical identity. Fetched here too so Home never
    // has to render someone else's name while waiting for the Profile tab.
    dispatch(fetchProfile());
  }, [dispatch]);

  // LIVE NEW-JOB SIGNAL.
  //
  // The durable HSNotification is created the moment a customer books, but a
  // provider sitting on this screen saw nothing until they navigated away and
  // back. The server addresses `booking_created` to the provider personally
  // (they are not in the booking's room yet), so binding it here turns a new
  // job into an immediate badge.
  //
  // Refetches rather than incrementing locally: the count is server state, and
  // a local ++ would drift the moment anything else marked a notification read.
  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | undefined;

    const onBookingCreated = () => {
      if (!mounted) return;
      dispatch(fetchDashboardData());
      dispatch(fetchProfile());
    };

    const bind = async () => {
      const s = await getSocket();
      if (!mounted || !s) return;
      // Idempotent across reconnects — off() before on() so a rebind cannot
      // stack a second handler and double-fetch.
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(refreshDashboard());
    setRefreshing(false);
  }, [dispatch]);

  const toJobData = (job: DashboardJobLocal): JobData => {
    const location = job.location || '';
    return {
      id: job.id,
      serviceType: job.title,
      category: job.category,
      customerName: job.customer,
      customerPhone: job.phone || 'N/A',
      // `customerAvatar` is nullable on the dashboard payload but optional on
      // JobData; Avatar downstream treats both as "no photo".
      customerImage: job.customerAvatar ?? undefined,
      address: location,
      city: location.split(',').pop()?.trim() || '',
      date: job.date,
      time: job.time,
      estimatedPrice: job.price,
      coordinates: {
        latitude: 31.5204, // Default coordinates — should come from job data
        longitude: 74.3587,
      },
    };
  };

  const handleNavigateToJob = useCallback(
    (job: DashboardJobLocal) => {
      const jobData = toJobData(job);
      dispatch(setJobDetail(jobData));
      navigation.navigate('JobDetail', { job: jobData });
    },
    [dispatch, navigation]
  );

  const handleMessage = useCallback(
    (job: DashboardJobLocal) => {
      // Previously this button had no onPress — it looked live and did nothing.
      (navigation as any).navigate('ProviderChatScreen', {
        bookingId: job.id,
        counterpartName: job.customer,
        counterpartImage: job.customerAvatar,
      });
    },
    [navigation]
  );

  const showInitialLoader = loading && !identity.name;

  return (
    <Screen background={colors.bg} barStyle="light-content">
      <Header
        profile={identity}
        insetTop={insets.top}
        onOpenNotifications={() => (navigation as any).navigate('ProviderNotifications')}
        onOpenProfile={() => (navigation as any).navigate('Profile')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Wallet — one component, one data source, everywhere. Resolved from
            THIS provider's own JWT. */}
        <MiniWalletCard onPress={() => (navigation as any).navigate('WalletScreen')} />

        {/* The provider's inbox. Until this existed, chat was reachable only by
            drilling into one specific job, so a message could sit unread
            indefinitely with nothing to surface it. */}
        <TouchableOpacity
          style={styles.messages}
          onPress={() => (navigation as any).navigate('ProviderConversations')}
          activeOpacity={0.7}
        >
          <View style={styles.messagesIcon}>
            <Ionicons name="chatbubbles-outline" size={19} color={colors.ink} />
          </View>
          <View style={styles.messagesBody}>
            <Text style={styles.messagesTitle}>Messages</Text>
            <Text style={styles.messagesSub}>Chat and call your customers</Text>
          </View>
          {unreadTotal > 0 && (
            <View style={styles.messagesBadge}>
              <Text style={styles.messagesBadgeText}>
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
        </TouchableOpacity>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={3}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => dispatch(fetchDashboardData())}>
              <Text style={styles.errorRetry}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {showInitialLoader ? (
          <View style={styles.loading} accessibilityLabel="Loading your dashboard">
            <SkeletonCard lines={2} />
            <View style={styles.loadingGap}>
              <SkeletonCard lines={3} />
            </View>
          </View>
        ) : (
          <>
            <StatsCard stats={stats} />
            <PerformanceSection insights={insights} />
            <JobsSection
              jobs={jobs}
              activeTab={activeTab}
              onSelectTab={(tab) => dispatch(setActiveTab(tab))}
              onAccept={(job) => setPendingJob({ job, action: 'accept' })}
              onReject={(job) => setPendingJob({ job, action: 'reject' })}
              onNavigateToJob={handleNavigateToJob}
              onMessage={handleMessage}
            />
            <ActivitySection recentActivity={recentActivity} />
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <ActionSheet
        visible={!!pendingJob}
        title={
          pendingJob?.action === 'accept'
            ? `Accept ${pendingJob?.job.title}?`
            : `Decline ${pendingJob?.job.title}?`
        }
        message={
          pendingJob?.action === 'accept'
            ? `${pendingJob?.job.customer} will be told you're taking this job.`
            : 'The job goes back to other providers nearby.'
        }
        cancelLabel="Not yet"
        onClose={() => setPendingJob(null)}
        options={[
          {
            label: pendingJob?.action === 'accept' ? 'Accept job' : 'Decline job',
            icon:
              pendingJob?.action === 'accept'
                ? 'checkmark-circle-outline'
                : 'close-circle-outline',
            tone: pendingJob?.action === 'reject' ? 'destructive' : 'default',
            onPress: () => {
              if (!pendingJob) return;
              if (pendingJob.action === 'accept') dispatch(acceptJob(pendingJob.job.id));
              else dispatch(rejectJob(pendingJob.job.id));
            },
          },
        ]}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: S.md,
    // Painted in the module green like every AppBar in home services, so the
    // dashboard does not read as a different app from the screens it opens.
    // `accentDeep`, not `accent`: white measures 5.48:1 on it and 3.77:1 on
    // the lighter one, and this carries a name at body size.
    backgroundColor: c.accentDeep,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    // White on the green ground, not green-on-green: c.success and
    // c.accentDeep are the same hex, so the old dot vanished into the header
    // and only its ring was visible.
    backgroundColor: c.inkInverse,
    borderWidth: 2,
    borderColor: c.accentDeep,
  },
  headerInfo: {
    flex: 1,
    marginLeft: S.md,
  },
  greeting: {
    ...T.caption,
    color: c.inkInverseSoft,
  },
  userName: {
    ...T.subhead,
    color: c.inkInverse,
  },
  credentials: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  credentialsText: {
    ...T.caption,
    color: c.inkInverseSoft,
    marginLeft: 3,
  },
  bell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: c.error,
    // Same ring AppBar gives its badge: red loses its edge against the green.
    borderWidth: 2,
    borderColor: c.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: c.inkInverse,
    ...T.caption,
    fontFamily: F.bold,
  },

  content: {
    padding: GUTTER,
  },
  bottomSpacer: {
    height: 90,
  },

  messages: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.lg,
    padding: S.lg,
    borderRadius: R.card,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
  messagesIcon: {
    width: 40,
    height: 40,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesBody: {
    flex: 1,
    marginHorizontal: S.md,
  },
  messagesTitle: {
    ...T.subhead,
    color: c.ink,
  },
  messagesSub: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 1,
  },
  messagesBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.pill,
    backgroundColor: c.error,
    marginRight: S.sm,
  },
  messagesBadgeText: {
    ...T.caption,
    color: c.inkInverse,
    fontFamily: F.bold,
    textAlign: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.lg,
    padding: S.md,
    borderRadius: R.control,
    backgroundColor: c.errorSoft,
  },
  errorText: {
    ...T.caption,
    color: c.error,
    flex: 1,
    marginRight: S.md,
  },
  errorRetry: {
    ...T.label,
    color: c.error,
    fontFamily: F.bold,
  },

  loading: {
    marginTop: SECTION,
  },
  loadingGap: {
    marginTop: S.md,
  },

  statsCard: {
    marginTop: SECTION,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...T.title,
    color: c.ink,
    marginTop: S.sm,
  },
  statLabel: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 1,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: c.line,
  },

  section: {
    marginTop: SECTION,
  },

  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
    marginHorizontal: -S.xs,
  },
  insightCell: {
    width: '50%',
    padding: S.xs,
  },
  insightCard: {
    minHeight: 104,
  },
  insightValue: {
    ...T.heading,
    color: c.ink,
  },
  insightTitle: {
    ...T.body,
    color: c.inkMuted,
    marginTop: 2,
  },
  insightTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm,
  },
  insightSubtitle: {
    ...T.caption,
    color: c.inkFaint,
    marginLeft: 4,
    flexShrink: 1,
  },

  tabs: {
    flexDirection: 'row',
    marginTop: S.md,
    marginBottom: S.md,
  },
  tabChip: {
    marginRight: S.sm,
  },

  jobCard: {
    marginBottom: S.md,
  },
  jobTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  jobTitle: {
    ...T.subhead,
    color: c.ink,
    flex: 1,
    marginRight: S.sm,
  },
  jobPrice: {
    ...T.bodyStrong,
    color: c.ink,
  },
  jobCustomer: {
    ...T.body,
    color: c.inkMuted,
    marginTop: 2,
  },
  jobMeta: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: S.sm,
  },
  jobActions: {
    flexDirection: 'row',
    marginTop: S.lg,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  jobSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: R.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
    marginRight: S.sm,
  },
  jobSecondaryText: {
    ...T.label,
    color: c.ink,
    marginLeft: 6,
  },
  jobPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: R.control,
    backgroundColor: c.accent,
  },
  jobPrimaryText: {
    ...T.label,
    color: c.inkInverse,
    fontFamily: F.semibold,
    marginLeft: 6,
  },
  jobDecline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: R.control,
    backgroundColor: c.errorSoft,
    marginRight: S.sm,
  },
  jobDeclineText: {
    ...T.label,
    color: c.error,
    fontFamily: F.semibold,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
  },
  activityDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: R.control,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
    marginHorizontal: S.md,
  },
  activityTitle: {
    ...T.body,
    color: c.ink,
  },
  activityDesc: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 1,
  },
  activityTime: {
    ...T.caption,
    color: c.inkFaint,
    marginTop: 2,
  },
});
