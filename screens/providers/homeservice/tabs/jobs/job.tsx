import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getSocket } from '../../../../../services/socket/socketClient';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Star,
  Sliders,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../../store/store';
import {
  selectFilteredJobs,
  selectJobsStats,
  setFilter,
  fetchJobs,
  JobStatus,
  Job,
} from './jobSlice';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { theme } from '../../providerTheme';
import { C, F, T } from '../../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../../providerTheme';
import { AppBar, Screen } from '../../../../../components/ui';

const { width } = Dimensions.get('window');

// Design System - Matching reference design

// Status configurations matching reference colors
// A function of the ramp: the `*Soft` grounds below invert between modes.
const makeStatusConfig = (
  c: ThemeColors,
): Record<string, { color: string; bg: string; label: string; icon: any }> => ({
  upcoming: {
    color: c.warning,
    bg: c.warningSoft,
    label: 'Upcoming',
    icon: AlertCircle,
  },
  active: {
    color: c.info,
    bg: c.infoSoft,
    label: 'In Progress',
    icon: Clock,
  },
  completed: {
    color: c.success,
    bg: c.successSoft,
    label: 'Completed',
    icon: CheckCircle2,
  },
  cancelled: {
    color: c.error,
    bg: c.errorSoft,
    label: 'Cancelled',
    icon: XCircle,
  },
  available: {
    color: c.success,
    bg: c.successSoft,
    label: 'Available',
    icon: Calendar,
  },
  today: {
    // Was a purple that exists in no palette. 'Available' already owns success,
    // so 'Today' takes info — the remaining semantic slot, not a new hue.
    color: c.info,
    bg: c.infoSoft,
    label: 'Today',
    icon: Calendar,
  },
});

// Service images mapping
const serviceImages: Record<string, string> = {
  'AC': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
  'Plumbing': 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop',
  'Electrical': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
  'Cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
  'Painting': 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=400&fit=crop',
  'Carpentry': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop',
  'Garden': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
  'default': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
};

const JobsScreen: React.FC = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const statusConfig = useMemo(() => makeStatusConfig(colors), [colors]);

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

  const getServiceImage = (title: string): string => {
    for (const key of Object.keys(serviceImages)) {
      if (title.toLowerCase().includes(key.toLowerCase())) {
        return serviceImages[key];
      }
    }
    return serviceImages.default;
  };

  const getStatusBorderColor = (status: string): string => {
    return statusConfig[status]?.color || theme.colors.primary;
  };

  // Job Card Component - Matching reference design exactly
  const JobCard = ({ job, index }: { job: Job; index: number }) => {
    const status = statusConfig[job.status] || statusConfig.available;
    const StatusIcon = status.icon;
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    }, [index]);

    return (
      <Animated.View
        style={[
          styles.jobCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Status Border Line - Left side */}
        <View style={[styles.statusBorder, { backgroundColor: status.color }]} />

        <View style={styles.cardContent}>
          {/* Service Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getServiceImage(job.title) }}
              style={styles.serviceImage}
            />
            {/* Category Tag */}
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {job.category?.toUpperCase() || 'SERVICE'}
              </Text>
            </View>
          </View>

          {/* Job Details */}
          <View style={styles.jobDetails}>
            {/* Provider Row */}
            <View style={styles.providerRow}>
              <View style={styles.providerInfo}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitial}>
                    {job.customer.name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.providerName} numberOfLines={1}>
                  {job.customer.name}
                </Text>
              </View>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <StatusIcon size={12} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Job Title */}
            <Text style={styles.jobTitle} numberOfLines={1}>
              {job.title}
            </Text>

            {/* Date & Time Row */}
            <View style={styles.detailRow}>
              <Calendar size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.detailText}>{job.schedule.date}</Text>
              <Clock size={14} color={theme.colors.text.tertiary} style={{ marginLeft: 12 }} />
              <Text style={styles.detailText}>{job.schedule.time}</Text>
            </View>

            {/* Location Row */}
            <View style={styles.detailRow}>
              <MapPin size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.detailText} numberOfLines={1}>
                {job.location.address}, {job.location.city}
              </Text>
            </View>

            {/* Price & Actions Row */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>PKR {job.pricing.amount?.toLocaleString() || '0'}</Text>
              
              {/* Show rating for completed, actions for active */}
              {job.status === 'completed' ? (
                <View style={styles.ratingBadge}>
                  <Star size={14} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.ratingText}>{job.customer.rating?.toFixed(1) || '5.0'}</Text>
                </View>
              ) : job.status === 'active' || job.status === 'upcoming' ? (
                // These two rendered but did nothing — no onPress at all — so
                // the Jobs list looked like it offered contact and did not.
                // Both now open the in-app room for the job, matching every
                // other provider surface. `job.id` is the booking id.
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      navigation.navigate('ProviderCallScreen', {
                        bookingId: job.id,
                        customerName: job.customer.name,
                        customerImage: job.customer.avatar || undefined,
                      })
                    }
                    accessibilityLabel={`Call ${job.customer.name}`}
                  >
                    <Phone size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      navigation.navigate('ProviderJobChat', {
                        bookingId: job.id,
                        customerName: job.customer.name,
                      })
                    }
                    accessibilityLabel={`Message ${job.customer.name}`}
                  >
                    <MessageSquare size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

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
            <Sliders size={20} color={colors.inkInverse} />
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
                  <Filter size={14} color={theme.colors.text.inverse} />
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
          <Filter size={16} color={theme.colors.text.tertiary} />
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
        {loading && filteredJobs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptyText}>
              Your bookings will appear here
            </Text>
          </View>
        ) : (
          filteredJobs.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} />
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  headerSubtitle: {
    ...T.body,

    color: theme.colors.text.secondary,
  },
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
  jobCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
  },
  statusBorder: {
    width: 4,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  serviceImage: {
    width: 110,
    height: 130,
    borderRadius: theme.borderRadius.md,
    backgroundColor: c.surfaceSunken,
  },
  categoryTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    ...T.caption,
    fontFamily: F.bold,
    color: theme.colors.text.inverse,
    letterSpacing: 0.5,
  },
  jobDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  providerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  providerInitial: {
    ...T.caption,
    fontFamily: F.semibold,
    color: theme.colors.primary,
  },
  providerName: {
    ...T.caption,

    color: theme.colors.text.secondary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    ...T.caption,
    fontFamily: F.semibold,
  },
  jobTitle: {
    ...T.body,
    fontFamily: F.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    ...T.caption,

    color: theme.colors.text.secondary,
    marginLeft: 6,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: {
    ...T.subhead,
    fontFamily: F.bold,
    color: theme.colors.primary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    ...T.label,
    fontFamily: F.semibold,
    color: c.warning,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    ...T.body,

    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    ...T.subhead,
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    ...T.body,

    color: theme.colors.text.secondary,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default JobsScreen;