import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Home,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  TrendingUp,
  ChevronRight,
  Zap,
  DollarSign,
  Users,
  Award,
} from 'lucide-react-native';
import {
  fetchDashboardData,
  refreshDashboard,
  acceptJob,
  rejectJob,
  setActiveTab,
} from './dashboardSlice';
import type {
  DashboardProfile,
  DashboardStats,
  DashboardInsight,
  DashboardJobLocal,
  RecentActivity,
} from './dashboardSlice';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../../store/store';
import { setJobDetail, JobData } from '../../jobdetail-screen/jobDetailSlice';
import { fetchProfile } from '../../profile-screen/profileSlice';
import MiniWalletCard from '../../../../../components/MiniWalletCard/MiniWalletCard';

type RootStackParamList = {
  JobDetail: { job?: JobData };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

// Design System - Matching reference design
const theme = {
  colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    purple: '#8B5CF6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getInitials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return initials || 'P';
};

// ---------------------------------------------------------------------------
// Sections live at module scope on purpose. When they were declared inside
// Dashboard, every render produced new component identities, so React
// unmounted and remounted each subtree. Combined with the native-driver fade
// below that left them stuck at opacity 0 — the "blank screen under the wallet
// card" bug. Keep these out here.
// ---------------------------------------------------------------------------

const Header: React.FC<{ profile: DashboardProfile; insetTop: number }> = ({
  profile,
  insetTop,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatar = !!profile.avatar && !avatarFailed;

  return (
    <View style={[styles.header, { paddingTop: Math.max(insetTop, theme.spacing.lg) }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.avatarContainer}>
          {showAvatar ? (
            <Image
              source={{ uri: profile.avatar as string }}
              style={styles.avatar}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{getInitials(profile.name)}</Text>
            </View>
          )}
          {profile.isOnline && <View style={styles.onlineDot} />}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName} numberOfLines={1}>{profile.name || 'Provider'}</Text>
          <View style={styles.badgeRow}>
            {profile.rating > 0 && (
              <View style={styles.ratingBadge}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
              </View>
            )}
            {profile.isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.notificationBtn}>
        <Text style={styles.bellIcon}>🔔</Text>
        {(profile.unreadNotifications ?? 0) > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {(profile.unreadNotifications ?? 0) > 9 ? '9+' : profile.unreadNotifications}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const StatsCard: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
  <View style={styles.statsCard}>
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryDark]}
      style={styles.statsGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Briefcase size={20} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.statValue}>{stats.todayJobs}</Text>
          <Text style={styles.statLabel}>Today's Jobs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Calendar size={20} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.statValue}>{stats.weekJobs}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <CheckCircle2 size={20} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.statValue}>{stats.completionRate}%</Text>
          <Text style={styles.statLabel}>Complete Rate</Text>
        </View>
      </View>
    </LinearGradient>
  </View>
);

const PerformanceSection: React.FC<{ insights: DashboardInsight[] }> = ({ insights }) => {
  if (!insights.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.insightScroll}
      >
        {insights.map((insight) => {
          // The API does not always send colours; falling back keeps
          // `color + '20'` from producing the invalid colour "undefined20".
          const accent = insight.color || theme.colors.primary;
          return (
            <View
              key={insight.id}
              style={[
                styles.insightCard,
                { backgroundColor: insight.bgColor || theme.colors.surface },
              ]}
            >
              <View style={styles.insightHeader}>
                <View style={[styles.insightIcon, { backgroundColor: accent + '20' }]}>
                  <TrendingUp size={18} color={accent} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: theme.colors.surface }]}>
                  <TrendingUp
                    size={12}
                    color={insight.trend === 'down' ? theme.colors.error : theme.colors.success}
                  />
                </View>
              </View>
              <Text style={styles.insightValue}>{insight.value}</Text>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              {!!insight.subtitle && (
                <Text style={styles.insightSubtitle}>{insight.subtitle}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

interface JobsSectionProps {
  jobs: { today: DashboardJobLocal[]; available: DashboardJobLocal[] };
  activeTab: 'today' | 'available';
  onSelectTab: (tab: 'today' | 'available') => void;
  onAccept: (jobId: string) => void;
  onReject: (jobId: string) => void;
  onNavigateToJob: (job: DashboardJobLocal) => void;
}

const JobsSection: React.FC<JobsSectionProps> = ({
  jobs,
  activeTab,
  onSelectTab,
  onAccept,
  onReject,
  onNavigateToJob,
}) => {
  const currentJobs = activeTab === 'today' ? jobs.today : jobs.available;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Jobs</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => onSelectTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => onSelectTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
            Available ({jobs.available.length})
          </Text>
        </TouchableOpacity>
      </View>

      {currentJobs.length > 0 ? (
        currentJobs.map((job) => (
          <View key={job.id} style={styles.jobCard}>
            <View
              style={[
                styles.jobStatusLine,
                {
                  backgroundColor:
                    activeTab === 'today' ? theme.colors.primary : theme.colors.info,
                },
              ]}
            />
            <View style={styles.jobContent}>
              <View style={styles.jobHeader}>
                <View style={styles.jobHeaderText}>
                  <Text style={styles.jobService}>{job.title}</Text>
                  <Text style={styles.jobCustomer}>{job.customer}</Text>
                </View>
                {activeTab === 'available' && !!job.category && (
                  <View style={styles.distanceBadge}>
                    <MapPin size={12} color={theme.colors.primary} />
                    <Text style={styles.distanceText}>{job.category}</Text>
                  </View>
                )}
              </View>

              <View style={styles.jobDetails}>
                <View style={styles.jobDetailRow}>
                  <Clock size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.jobDetailText}>{job.time || 'Time to be confirmed'}</Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <MapPin size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.jobDetailText} numberOfLines={1}>
                    {(job.location || 'Location unavailable').split(',')[0]}
                  </Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Phone size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.jobDetailText}>{job.phone || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.jobActions}>
                {activeTab === 'today' ? (
                  <>
                    <TouchableOpacity style={styles.secondaryBtn}>
                      <MessageSquare size={16} color={theme.colors.primary} />
                      <Text style={styles.secondaryBtnText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={() => onNavigateToJob(job)}
                    >
                      <MapPin size={16} color={theme.colors.text.inverse} />
                      <Text style={styles.primaryBtnText}>Navigate</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => onReject(job.id)}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => onAccept(job.id)}
                    >
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyJobs}>
          <Briefcase size={40} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No {activeTab} jobs</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'today'
              ? 'Your schedule is clear for today'
              : 'Check back later for new opportunities'}
          </Text>
        </View>
      )}
    </View>
  );
};

const ActivitySection: React.FC<{ recentActivity: RecentActivity[] }> = ({
  recentActivity,
}) => {
  if (!recentActivity.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {recentActivity.map((activity) => {
        // `mapDashboardData` only carries id/type/message/time across, so
        // title/description/colour/status are frequently undefined here.
        const accent = activity.color || theme.colors.primary;
        const title = activity.title || activity.message || 'Activity';
        const description = activity.title ? activity.description || activity.message : activity.description;

        return (
          <View key={activity.id} style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: accent + '15' }]}>
              <CheckCircle2 size={20} color={accent} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{title}</Text>
              {!!description && <Text style={styles.activityDesc}>{description}</Text>}
              {!!activity.time && <Text style={styles.activityTime}>{activity.time}</Text>}
            </View>
            {!!activity.status && (
              <View
                style={[
                  styles.activityStatus,
                  {
                    backgroundColor:
                      activity.status === 'Completed' ? theme.colors.primaryLight : '#EFF6FF',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.activityStatusText,
                    {
                      color:
                        activity.status === 'Completed'
                          ? theme.colors.primary
                          : theme.colors.info,
                    },
                  ]}
                >
                  {activity.status}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {
    profile,
    stats,
    insights,
    jobs,
    recentActivity,
    activeTab,
    loading,
    error,
  } = useAppSelector((state: RootState) => state.dashboard);

  // ONE identity source for the provider shell.
  //
  // Home read `state.dashboard.profile` (GET /provider/dashboard) while the
  // Profile screen read `state.profile` (GET /provider/profile). Two payloads,
  // two fetch times, no shared reset — so whichever was stale showed the wrong
  // provider, and the two screens disagreed about who was signed in.
  // /provider/profile is canonical; the dashboard payload only fills in while
  // it is still loading.
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    dispatch(fetchDashboardData());
    // The provider shell's canonical identity. Fetched here too so Home never
    // has to render someone else's name while waiting for the Profile tab to
    // be opened.
    dispatch(fetchProfile());
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(refreshDashboard());
    setRefreshing(false);
  }, [dispatch]);

  const handleAcceptJob = useCallback((jobId: string) => {
    Alert.alert('Accept Job', 'Are you sure you want to accept this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => dispatch(acceptJob(jobId)) },
    ]);
  }, [dispatch]);

  const handleRejectJob = useCallback((jobId: string) => {
    Alert.alert('Decline Job', 'Are you sure you want to decline this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => dispatch(rejectJob(jobId)) },
    ]);
  }, [dispatch]);

  const handleNavigateToJob = useCallback((job: any) => {
    // Transform dashboard job to JobData format
    const location = job.location || '';
    const jobData: JobData = {
      id: job.id,
      serviceType: job.title,
      category: job.category,
      customerName: job.customer,
      customerPhone: job.phone || 'N/A',
      customerImage: job.customerAvatar,
      address: location,
      city: location.split(',').pop()?.trim() || '',
      date: job.date,
      time: job.time,
      estimatedPrice: job.price,
      coordinates: {
        latitude: 31.5204, // Default coordinates - should come from job data
        longitude: 74.3587,
      },
    };
    
    dispatch(setJobDetail(jobData));
    navigation.navigate('JobDetail', { job: jobData });
  }, [dispatch, navigation]);

  const handleSelectTab = useCallback(
    (tab: 'today' | 'available') => dispatch(setActiveTab(tab)),
    [dispatch]
  );

  const showInitialLoader = loading && !identity.name;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} translucent={false} />

      <Header profile={identity} insetTop={insets.top} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Wallet — one component, one data source, everywhere (W2 Part 4).
            Resolved from THIS provider's own JWT — independent from every
            other provider's balance. */}
        <MiniWalletCard onPress={() => (navigation as any).navigate('WalletScreen')} />

        {/* A single fade wrapper for the whole feed. Each section used to own
            its own `opacity: fadeAnim` binding; because the sections remounted
            on every data change they latched at opacity 0 and never appeared. */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => dispatch(fetchDashboardData())}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {showInitialLoader ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading your dashboard…</Text>
            </View>
          ) : (
            <>
              <StatsCard stats={stats} />
              <PerformanceSection insights={insights} />
              <JobsSection
                jobs={jobs}
                activeTab={activeTab}
                onSelectTab={handleSelectTab}
                onAccept={handleAcceptJob}
                onReject={handleRejectJob}
                onNavigateToJob={handleNavigateToJob}
              />
              <ActivitySection recentActivity={recentActivity} />
            </>
          )}
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
    flexShrink: 0,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    backgroundColor: theme.colors.success,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  headerInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  greeting: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
    maxWidth: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  proBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  notificationBtn: {
    position: 'relative',
    width: 46,
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bellIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.xl,
  },
  statsCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statsGradient: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.inverse,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  insightScroll: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  insightCard: {
    width: width * 0.6,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightValue: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  insightSubtitle: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  jobCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  jobStatusLine: {
    width: 4,
  },
  jobContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  jobService: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  jobCustomer: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  jobDetails: {
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobDetailText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  jobActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  acceptBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: 10,
    borderRadius: 10,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  declineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  emptyJobs: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  activityStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
  avatarFallback: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  jobHeaderText: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
  },
  retryBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.error,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});