// FILE: screens/admin/providers/service-providers/tabs/bookings/bookings.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../../../../hooks/useReduxHooks';
import {
  setSearchQuery,
  setFilterStatus,
  updateBookingStatus,
  selectStatusCount,
} from './bookingsSlice';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const colors = {
  primary: '#20C997',
  background: '#F8FAFB',
  surface: '#FFFFFF',
  text: {
    primary: '#1A1D29',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  border: '#E5E7EB',
};

const statusColors = {
  upcoming: { bg: '#FFF7ED', text: '#F59E0B', border: '#FED7AA' },
  completed: { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
  cancelled: { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' },
  'in-progress': { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
};

export default function BookingsScreen() {
  const dispatch = useAppDispatch();
  const { filteredBookings, searchQuery, filterStatus } = useAppSelector(
    (state) => state.adminSPBookings
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statuses = ['all', 'upcoming', 'in-progress', 'completed', 'cancelled'];

  const getStatusCount = (status: string) => {
    return useAppSelector((state) => selectStatusCount(state, status));
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      MAINTENANCE: 'construct',
      PLUMBING: 'water',
      ELECTRICAL: 'flash',
      CLEANING: 'sparkles',
    };
    return icons[category] || 'construct';
  };

  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, string> = {
      MAINTENANCE: '#3B82F6',
      PLUMBING: '#10B981',
      ELECTRICAL: '#F59E0B',
      CLEANING: '#8B5CF6',
    };
    return categoryColors[category] || '#6B7280';
  };

  const BookingCard = ({ booking, index }: { booking: any; index: number }) => {
    const statusStyle = statusColors[booking.status as keyof typeof statusColors];
    const categoryColor = getCategoryColor(booking.category);
    
    return (
      <Animated.View
        style={[
          styles.bookingCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, index * 5]
                })
              }
            ]
          }
        ]}
      >
        <View style={[styles.statusBar, { backgroundColor: statusStyle.bg }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.providerInfo}>
              <View style={styles.providerAvatar}>
                <Ionicons name="person" size={16} color={colors.text.secondary} />
              </View>
              <Text style={styles.providerName}>{booking.providerName}</Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.serviceSection}>
            <View style={styles.serviceImageContainer}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <Text style={styles.categoryText}>{booking.category}</Text>
              </View>
            </View>

            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{booking.service}</Text>
              
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.detailText}>{booking.date}</Text>
                <Ionicons name="time-outline" size={14} color={colors.text.secondary} style={{ marginLeft: 12 }} />
                <Text style={styles.detailText}>{booking.time}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.detailText} numberOfLines={1}>{booking.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.price}>{booking.amount}</Text>
            
            <View style={styles.actions}>
              <TouchableOpacity style={styles.callButton} activeOpacity={0.7}>
                <View style={styles.actionButtonInner}>
                  <Ionicons name="call" size={18} color={colors.success} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.messageButton} activeOpacity={0.7}>
                <View style={styles.actionButtonInner}>
                  <Ionicons name="chatbubble" size={18} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {booking.status === 'completed' && (
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>5.0</Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>My Bookings</Text>
            <Text style={styles.subtitle}>Manage your service appointments</Text>
          </View>
          
          <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
            <Ionicons name="filter" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabs}
          contentContainerStyle={styles.filterTabsContent}
        >
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filterStatus === status && styles.activeFilterTab
              ]}
              onPress={() => dispatch(setFilterStatus(status))}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                {status !== 'all' && (
                  <Ionicons
                    name={
                      status === 'upcoming' ? 'time' :
                      status === 'in-progress' ? 'hourglass' :
                      status === 'completed' ? 'checkmark-circle' :
                      'close-circle'
                    }
                    size={16}
                    color={filterStatus === status ? colors.surface : colors.text.secondary}
                  />
                )}
                <Text style={[
                  styles.filterTabText,
                  filterStatus === status && styles.activeFilterTabText
                ]}>
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </Text>
                <View style={[
                  styles.countBadge,
                  filterStatus === status && styles.activeCountBadge
                ]}>
                  <Text style={[
                    styles.countText,
                    filterStatus === status && styles.activeCountText
                  ]}>
                    {getStatusCount(status)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.bookingsList}
        contentContainerStyle={styles.bookingsListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.map((booking, index) => (
          <BookingCard key={booking.id} booking={booking} index={index} />
        ))}

        {filteredBookings.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: isAndroid ? spacing.lg : spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  sortButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    height: 52,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  filterTabs: {
    flexGrow: 0,
  },
  filterTabsContent: {
    gap: spacing.sm,
  },
  filterTab: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    height: 40,
    justifyContent: 'center',
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeFilterTabText: {
    color: colors.surface,
  },
  countBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  activeCountText: {
    color: colors.surface,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  bookingsList: {
    flex: 1,
  },
  bookingsListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBar: {
    height: 4,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  serviceSection: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  serviceImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginRight: spacing.md,
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.surface,
  },
  serviceDetails: {
    flex: 1,
    gap: spacing.sm,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
});

