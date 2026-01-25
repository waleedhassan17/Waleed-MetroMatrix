import React, { useRef, useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../../store/store';

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

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const {
    profile,
    stats,
    insights,
    jobs,
    recentActivity,
    activeTab,
    loading,
  } = useAppSelector((state: RootState) => state.dashboard);

  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    dispatch(fetchDashboardData());
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Header Component
  const Header = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing.lg) }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.avatarContainer}>
          <Image 
            source={{ uri: profile.avatar || 'https://ui-avatars.com/api/?name=User&background=059669&color=fff' }} 
            style={styles.avatar} 
            defaultSource={{ uri: 'https://ui-avatars.com/api/?name=User&background=059669&color=fff' }}
          />
          {profile.isOnline && <View style={styles.onlineDot} />}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName} numberOfLines={1}>{profile.name || 'Provider'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.ratingBadge}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{profile.rating?.toFixed(1) || '4.8'}</Text>
            </View>
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

  // Stats Card Component
  const StatsCard = () => (
    <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
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
    </Animated.View>
  );

  // Performance Cards
  const PerformanceSection = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
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
        {insights.map((insight, index) => (
          <View
            key={insight.id}
            style={[styles.insightCard, { backgroundColor: insight.bgColor }]}
          >
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
                <TrendingUp size={18} color={insight.color} />
              </View>
              <View style={[styles.trendBadge, { backgroundColor: theme.colors.surface }]}>
                <TrendingUp
                  size={12}
                  color={insight.trend === 'up' ? theme.colors.success : theme.colors.error}
                />
              </View>
            </View>
            <Text style={styles.insightValue}>{insight.value}</Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightSubtitle}>{insight.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Jobs Section
  const JobsSection = () => {
    const currentJobs = activeTab === 'today' ? jobs.today : jobs.available;

    return (
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jobs</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'today' && styles.tabActive]}
            onPress={() => dispatch(setActiveTab('today'))}
          >
            <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
            onPress={() => dispatch(setActiveTab('available'))}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
              Available ({jobs.available.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Jobs List */}
        {currentJobs.length > 0 ? (
          currentJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              {/* Status Line */}
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
                  <View>
                    <Text style={styles.jobService}>{job.title}</Text>
                    <Text style={styles.jobCustomer}>{job.customer}</Text>
                  </View>
                  {activeTab === 'available' && (
                    <View style={styles.distanceBadge}>
                      <MapPin size={12} color={theme.colors.primary} />
                      <Text style={styles.distanceText}>{job.category}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.jobDetails}>
                  <View style={styles.jobDetailRow}>
                    <Clock size={14} color={theme.colors.text.tertiary} />
                    <Text style={styles.jobDetailText}>{job.time}</Text>
                  </View>
                  <View style={styles.jobDetailRow}>
                    <MapPin size={14} color={theme.colors.text.tertiary} />
                    <Text style={styles.jobDetailText} numberOfLines={1}>
                      {job.location.split(',')[0]}
                    </Text>
                  </View>
                  <View style={styles.jobDetailRow}>
                    <Phone size={14} color={theme.colors.text.tertiary} />
                    <Text style={styles.jobDetailText}>{job.phone || 'N/A'}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.jobActions}>
                  {activeTab === 'today' ? (
                    <>
                      <TouchableOpacity style={styles.secondaryBtn}>
                        <MessageSquare size={16} color={theme.colors.primary} />
                        <Text style={styles.secondaryBtnText}>Message</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryBtn}>
                        <MapPin size={16} color={theme.colors.text.inverse} />
                        <Text style={styles.primaryBtnText}>Navigate</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleRejectJob(job.id)}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptJob(job.id)}
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
      </Animated.View>
    );
  };

  // Recent Activity Section
  const ActivitySection = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {recentActivity.map((activity) => (
        <View key={activity.id} style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: activity.color + '15' }]}>
            <CheckCircle2 size={20} color={activity.color} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityDesc}>{activity.description}</Text>
            <Text style={styles.activityTime}>{activity.time}</Text>
          </View>
          <View
            style={[
              styles.activityStatus,
              {
                backgroundColor:
                  activity.status === 'Completed'
                    ? theme.colors.primaryLight
                    : '#EFF6FF',
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
        </View>
      ))}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} translucent={false} />

      <Header />

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
        <StatsCard />
        <PerformanceSection />
        <JobsSection />
        <ActivitySection />
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
});