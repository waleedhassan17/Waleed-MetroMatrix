// Bookings Screen - Professional MetroMatrix Style
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '../../../../../constants/Colors';
import { Typography } from '../../../../../constants/Fonts';

const { width } = Dimensions.get('window');

// Types
type BookingStatus = 'upcoming' | 'completed' | 'cancelled' | 'in_progress';

interface Booking {
  id: string;
  serviceName: string;
  serviceImage: string;
  categoryName: string;
  providerName: string;
  providerAvatar: string;
  status: BookingStatus;
  date: string;
  time: string;
  address: string;
  price: number;
  rating?: number;
}

type FilterType = 'all' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

// Mock Bookings Data
const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    serviceName: 'AC Installation & Repair',
    serviceImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd',
    categoryName: 'Maintenance',
    providerName: 'CoolTech Services',
    providerAvatar: 'https://i.pravatar.cc/150?img=1',
    status: 'upcoming',
    date: 'Jan 15, 2025',
    time: '10:00 AM',
    address: '123 Main Street, Lahore',
    price: 2500,
  },
  {
    id: 'booking-2',
    serviceName: 'Pipe Leak Repair',
    serviceImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7',
    categoryName: 'Plumbing',
    providerName: 'QuickFix Plumbing',
    providerAvatar: 'https://i.pravatar.cc/150?img=2',
    status: 'completed',
    date: 'Jan 8, 2025',
    time: '2:00 PM',
    address: '456 Garden Road, Lahore',
    price: 1500,
    rating: 5,
  },
  {
    id: 'booking-3',
    serviceName: 'Wiring & Installation',
    serviceImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
    categoryName: 'Electrical',
    providerName: 'PowerPro Electric',
    providerAvatar: 'https://i.pravatar.cc/150?img=3',
    status: 'cancelled',
    date: 'Jan 12, 2025',
    time: '11:00 AM',
    address: '789 Tech Park, Lahore',
    price: 3000,
  },
  {
    id: 'booking-4',
    serviceName: 'Home Deep Cleaning',
    serviceImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
    categoryName: 'Cleaning',
    providerName: 'SparkleClean',
    providerAvatar: 'https://i.pravatar.cc/150?img=4',
    status: 'in_progress',
    date: 'Jan 12, 2025',
    time: '9:00 AM',
    address: '321 Residence Lane, Lahore',
    price: 4500,
  },
  {
    id: 'booking-5',
    serviceName: 'AC Maintenance',
    serviceImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd',
    categoryName: 'Maintenance',
    providerName: 'CoolTech Services',
    providerAvatar: 'https://i.pravatar.cc/150?img=1',
    status: 'completed',
    date: 'Dec 20, 2024',
    time: '3:00 PM',
    address: '123 Main Street, Lahore',
    price: 1500,
    rating: 4,
  },
];

// Filter Options
const filterOptions: { key: FilterType; label: string; icon: typeof Calendar }[] = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'upcoming', label: 'Upcoming', icon: AlertCircle },
  { key: 'in_progress', label: 'Active', icon: Loader },
  { key: 'completed', label: 'Done', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

// Status Config
const statusConfig: Record<
  BookingStatus,
  { label: string; color: string; bgColor: string; borderColor: string; icon: typeof AlertCircle }
> = {
  upcoming: {
    label: 'Upcoming',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: AlertCircle,
  },
  in_progress: {
    label: 'In Progress',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    icon: Loader,
  },
  completed: {
    label: 'Completed',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: XCircle,
  },
};

// Professional Filter Tab Component
interface FilterTabProps {
  filter: { key: FilterType; label: string; icon: typeof Calendar };
  isActive: boolean;
  count: number;
  onPress: () => void;
}

const FilterTab: React.FC<FilterTabProps> = ({
  filter,
  isActive,
  count,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const FilterIcon = filter.icon;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.filterTab, isActive && styles.filterTabActive]}
      >
        {isActive ? (
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.filterTabGradient}
          >
            <FilterIcon size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.filterTabTextActive}>{filter.label}</Text>
            <View style={styles.filterTabCountActive}>
              <Text style={styles.filterTabCountTextActive}>{count}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.filterTabInner}>
            <FilterIcon size={14} color="#6B7280" strokeWidth={2} />
            <Text style={styles.filterTabText}>{filter.label}</Text>
            <View style={styles.filterTabCount}>
              <Text style={styles.filterTabCountText}>{count}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Booking Card Component
interface BookingCardProps {
  booking: Booking;
  index: number;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, index }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.bookingCardContainer,
        {
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.bookingCard}
      >
        {/* Status Indicator Line */}
        <View style={[styles.statusLine, { backgroundColor: status.color }]} />

        <View style={styles.bookingCardContent}>
          {/* Left: Service Image */}
          <View style={styles.serviceImageWrapper}>
            <Image
              source={{ uri: booking.serviceImage }}
              style={styles.bookingServiceImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.imageOverlay}
            />
            <View style={styles.categoryOverlay}>
              <Text style={styles.categoryOverlayText}>
                {booking.categoryName}
              </Text>
            </View>
          </View>

          {/* Right: Booking Details */}
          <View style={styles.bookingDetails}>
            {/* Header Row */}
            <View style={styles.bookingHeader}>
              <View style={styles.providerInfo}>
                <Image
                  source={{ uri: booking.providerAvatar }}
                  style={styles.providerAvatarSmall}
                />
                <Text style={styles.providerNameSmall} numberOfLines={1}>
                  {booking.providerName}
                </Text>
              </View>
              <View style={[styles.statusBadge, { 
                backgroundColor: status.bgColor,
                borderColor: status.borderColor,
              }]}>
                <StatusIcon size={12} color={status.color} strokeWidth={2.5} />
                <Text style={[styles.statusBadgeText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Service Name */}
            <Text style={styles.bookingServiceName} numberOfLines={1}>
              {booking.serviceName}
            </Text>

            {/* Details Row */}
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Calendar size={12} color="#6B7280" />
                <Text style={styles.detailText}>{booking.date}</Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={12} color="#6B7280" />
                <Text style={styles.detailText}>{booking.time}</Text>
              </View>
            </View>

            {/* Address */}
            <View style={styles.addressRow}>
              <MapPin size={12} color="#9CA3AF" />
              <Text style={styles.addressText} numberOfLines={1}>
                {booking.address}
              </Text>
            </View>

            {/* Footer Row */}
            <View style={styles.bookingFooter}>
              <Text style={styles.priceText}>
                PKR {booking.price.toLocaleString()}
              </Text>

              {/* Action Buttons */}
              {booking.status === 'upcoming' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Phone size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <MessageSquare size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Rating */}
              {booking.status === 'completed' && booking.rating && (
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{booking.rating}.0</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Rate Button for Completed */}
        {booking.status === 'completed' && !booking.rating && (
          <TouchableOpacity style={styles.rateButton}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rateButtonGradient}
            >
              <Star size={14} color="#F59E0B" />
              <Text style={styles.rateButtonText}>Rate this service</Text>
              <ChevronRight size={14} color="#F59E0B" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Empty State Component
const EmptyState: React.FC<{ filter: FilterType }> = ({ filter }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Calendar size={48} color="#9CA3AF" strokeWidth={1.5} />
    </View>
    <Text style={styles.emptyTitle}>No {filter === 'all' ? '' : filter} bookings</Text>
    <Text style={styles.emptySubtitle}>
      {filter === 'all'
        ? "You haven't made any bookings yet"
        : `You don't have any ${filter} bookings`}
    </Text>
    <TouchableOpacity style={styles.emptyButton} activeOpacity={0.8}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.emptyButtonGradient}
      >
        <Text style={styles.emptyButtonText}>Explore Services</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// Main Bookings Screen Component
export default function BookingsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Filter bookings
  const filteredBookings =
    activeFilter === 'all'
      ? mockBookings
      : mockBookings.filter((b) => b.status === activeFilter);

  // Get counts for each filter
  const getCounts = () => ({
    all: mockBookings.length,
    upcoming: mockBookings.filter((b) => b.status === 'upcoming').length,
    in_progress: mockBookings.filter((b) => b.status === 'in_progress').length,
    completed: mockBookings.filter((b) => b.status === 'completed').length,
    cancelled: mockBookings.filter((b) => b.status === 'cancelled').length,
  });

  const counts = getCounts();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your service appointments
          </Text>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <SlidersHorizontal size={20} color="#374151" />
        </TouchableOpacity>
      </Animated.View>

      {/* Filter Tabs - Professional Design */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filterOptions.map((filter) => (
            <FilterTab
              key={filter.key}
              filter={filter}
              isActive={activeFilter === filter.key}
              count={counts[filter.key]}
              onPress={() => setActiveFilter(filter.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.bookingsList}
        contentContainerStyle={styles.bookingsContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Results Count */}
        {filteredBookings.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredBookings.length} booking
              {filteredBookings.length !== 1 ? 's' : ''} found
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Filter size={14} color="#6B7280" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bookings or Empty State */}
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking, index) => (
            <BookingCard key={booking.id} booking={booking} index={index} />
          ))
        ) : (
          <EmptyState filter={activeFilter} />
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '400',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  // Filters - Professional Design
  filtersWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 8,
  },
  filterTabActive: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  filterTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  filterTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 6,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterTabCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  filterTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  filterTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterTabCountTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bookings List
  bookingsList: {
    flex: 1,
  },
  bookingsContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Booking Card
  bookingCardContainer: {
    marginBottom: 16,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statusLine: {
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bookingCardContent: {
    flexDirection: 'row',
    padding: 14,
  },
  serviceImageWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  bookingServiceImage: {
    width: 85,
    height: 85,
    borderRadius: 14,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryOverlayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bookingDetails: {
    flex: 1,
    marginLeft: 14,
  },
  bookingHeader: {
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
  providerAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  providerNameSmall: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingServiceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Rate Button
  rateButton: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});