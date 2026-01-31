import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// Status configurations matching reference colors
const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  upcoming: {
    color: '#F59E0B',
    bg: '#FFFBEB',
    label: 'Upcoming',
    icon: AlertCircle,
  },
  active: {
    color: '#3B82F6',
    bg: '#EFF6FF',
    label: 'In Progress',
    icon: Clock,
  },
  completed: {
    color: '#10B981',
    bg: '#ECFDF5',
    label: 'Completed',
    icon: CheckCircle2,
  },
  cancelled: {
    color: '#EF4444',
    bg: '#FEF2F2',
    label: 'Cancelled',
    icon: XCircle,
  },
  available: {
    color: '#059669',
    bg: '#D1FAE5',
    label: 'Available',
    icon: Calendar,
  },
  today: {
    color: '#8B5CF6',
    bg: '#EDE9FE',
    label: 'Today',
    icon: Calendar,
  },
};

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
  const dispatch = useAppDispatch();
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
    dispatch(fetchJobs());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{job.customer.rating?.toFixed(1) || '5.0'}</Text>
                </View>
              ) : job.status === 'active' || job.status === 'upcoming' ? (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Phone size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header - Matching reference */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>Manage your service appointments</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Sliders size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

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
          {filteredJobs.length} bookings found
        </Text>
        <TouchableOpacity style={styles.sortButton}>
          <Filter size={16} color={theme.colors.text.secondary} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
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
    shadowColor: '#000',
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
    backgroundColor: '#F3F4F6',
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
    fontSize: 9,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  providerName: {
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
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
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default JobsScreen;