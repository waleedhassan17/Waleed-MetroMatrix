import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchDoctors,
  loadMore,
  setFilters,
  clearFilters,
  setSorting,
  setSelectedSpecialty,
  setSearchQuery,
  selectFilteredDoctors,
  selectActiveFilterCount,
  resetDoctorList,
} from './doctorListSlice';
import type {
  GenderFilter,
  AvailabilityFilter,
  ConsultationTypeFilter,
  SortOption,
  DoctorFilters,
} from './doctorListSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Doctor } from '../../../../models/healthcare/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Theme Colors (Consistent) ───────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FBBF24',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    accent: ['#5A9FFF', '#2A7FFF'],
  },
};

// ── Sort Options ────────────────────────────

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'relevance', label: 'Relevance', icon: 'sparkles' },
  { value: 'rating', label: 'Highest Rated', icon: 'star' },
  { value: 'fee-low', label: 'Price: Low to High', icon: 'trending-down' },
  { value: 'fee-high', label: 'Price: High to Low', icon: 'trending-up' },
  { value: 'experience', label: 'Most Experienced', icon: 'ribbon' },
];

// ── Fee Presets ──────────────────────────────

const FEE_PRESETS: { label: string; range: [number, number] }[] = [
  { label: 'Any Price', range: [0, 10000] },
  { label: 'Under PKR 1,000', range: [0, 1000] },
  { label: 'PKR 1,000 - 2,000', range: [1000, 2000] },
  { label: 'PKR 2,000 - 3,000', range: [2000, 3000] },
  { label: 'PKR 3,000+', range: [3000, 10000] },
];

// ── Cities ──────────────────────────────────

const CITIES = ['', 'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Peshawar', 'Faisalabad'];

// ── Skeleton Component ──────────────────────

const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 8, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  );
};

const DoctorCardSkeleton: React.FC = () => (
  <View style={styles.doctorCard}>
    <View style={styles.cardRow}>
      <SkeletonBox width={64} height={64} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <SkeletonBox width="70%" height={18} />
        <SkeletonBox width="50%" height={12} style={{ marginTop: 8 }} />
        <SkeletonBox width="80%" height={12} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <SkeletonBox width={50} height={22} borderRadius={11} />
          <SkeletonBox width={60} height={22} borderRadius={11} />
          <SkeletonBox width={55} height={22} borderRadius={11} />
        </View>
      </View>
    </View>
    <View style={[styles.cardBottom, { borderTopWidth: 0 }]}>
      <SkeletonBox width={80} height={24} />
      <SkeletonBox width={70} height={36} borderRadius={10} />
    </View>
  </View>
);

// ── Filter Chip Component ───────────────────

const FilterChip: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}> = ({ label, selected, onPress, icon }) => (
  <TouchableOpacity
    style={[styles.filterChip, selected && styles.filterChipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && (
      <Ionicons
        name={icon as any}
        size={14}
        color={selected ? '#FFFFFF' : Colors.text.secondary}
      />
    )}
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ── Main Component ──────────────────────────

const DoctorListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const {
    filters,
    pagination,
    loading,
    loadingMore,
    error,
    sortBy,
    searchQuery,
    selectedSpecialtyName,
  } = useAppSelector((state) => state.doctorList);
  const doctors = useAppSelector(selectFilteredDoctors);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);

  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Local filter state for the modal
  const [localFilters, setLocalFilters] = useState<DoctorFilters>(filters);

  // ── Init from route params ──────────────────

  useEffect(() => {
    const specialtyId = route.params?.specialtyId ?? '';
    const specialtyName = route.params?.specialtyName ?? '';
    dispatch(setSelectedSpecialty({ id: specialtyId || null, name: specialtyName }));

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [route.params?.specialtyId, route.params?.specialtyName, dispatch]);

  useEffect(() => {
    dispatch(fetchDoctors());
  }, [dispatch, sortBy, filters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDoctors());
    setRefreshing(false);
  }, [dispatch]);

  const handleLoadMore = () => {
    if (!loadingMore && pagination.hasNext) {
      dispatch(loadMore());
    }
  };

  const handleDoctorPress = (doctor: Doctor) => {
    navigation.navigate(HealthcareRouteNames.DoctorDetail, {
      doctorId: doctor.doctorId,
    });
  };

  const handleBack = () => navigation.goBack();

  const handleSearchSubmit = () => {
    dispatch(fetchDoctors());
  };

  // ── Filter Modal Handlers ─────────────────

  const openFilterModal = () => {
    setLocalFilters(filters);
    setFilterVisible(true);
  };

  const applyFilters = () => {
    dispatch(setFilters(localFilters));
    setFilterVisible(false);
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
    setLocalFilters({
      gender: 'any',
      availability: 'any',
      feeRange: [0, 10000],
      consultationType: 'both',
      city: '',
    });
    setFilterVisible(false);
  };

  // ── Doctor Card ─────────────────────────────

  const renderDoctorCard = useCallback(
    ({ item, index }: { item: Doctor; index: number }) => {
      const doctorName = item.bio?.split(' ')[1] || 'Doctor';

      return (
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.doctorCard}
            onPress={() => handleDoctorPress(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[THEME.primaryLight, '#F0F7FF']}
                  style={styles.avatar}
                >
                  <MaterialCommunityIcons
                    name="doctor"
                    size={28}
                    color={THEME.primary}
                  />
                </LinearGradient>
                {item.isAvailable && <View style={styles.onlineDot} />}
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.doctorName} numberOfLines={1}>
                    Dr. {doctorName}
                  </Text>
                  {item.isVerified && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={THEME.primary}
                    />
                  )}
                </View>
                <Text style={styles.qualifications} numberOfLines={1}>
                  {item.qualifications?.join(', ') || 'Specialist'}
                </Text>
                <Text style={styles.specialtyText} numberOfLines={1}>
                  {item.subspecialties?.join(' · ') || 'General Practice'}
                </Text>

                {/* Meta Row */}
                <View style={styles.metaRow}>
                  <View style={styles.ratingChip}>
                    <Ionicons name="star" size={11} color={THEME.star} />
                    <Text style={styles.ratingChipText}>
                      {item.rating?.toFixed(1) || '4.5'}
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons
                      name="briefcase-outline"
                      size={11}
                      color={Colors.text.secondary}
                    />
                    <Text style={styles.metaChipText}>
                      {item.experience || '5'}+ yrs
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="people-outline"
                      size={11}
                      color={Colors.text.secondary}
                    />
                    <Text style={styles.metaChipText}>
                      {item.totalPatients > 999
                        ? `${(item.totalPatients / 1000).toFixed(1)}k`
                        : item.totalPatients || '500+'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Row: Fee + Buttons */}
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.feeLabel}>Consultation Fee</Text>
                <Text style={styles.feeAmount}>
                  PKR {item.consultationFee || '1,500'}
                </Text>
              </View>
              <View style={styles.cardActions}>
                {item.videoConsultationFee > 0 && (
                  <View style={styles.videoBadge}>
                    <MaterialCommunityIcons
                      name="video-outline"
                      size={14}
                      color={THEME.accent}
                    />
                    <Text style={styles.videoBadgeText}>Video</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() =>
                    navigation.navigate(HealthcareRouteNames.BookAppointment, {
                      doctorId: item.doctorId,
                    })
                  }
                >
                  <LinearGradient
                    colors={THEME.gradient.primary as any}
                    style={styles.bookButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [fadeAnim, navigation]
  );

  // ── Footer ──────────────────────────────────

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <View style={styles.loadingDot} />
        <Text style={styles.loadingMoreText}>Loading more doctors...</Text>
      </View>
    );
  };

  // ── Empty ───────────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons
            name="stethoscope"
            size={48}
            color="#94A3B8"
          />
        </View>
        <Text style={styles.emptyTitle}>No Doctors Found</Text>
        <Text style={styles.emptySubtitle}>
          Try adjusting your filters or search query to find more results.
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={handleClearFilters}
          >
            <Ionicons name="close-circle" size={16} color={THEME.primary} />
            <Text style={styles.clearFiltersBtnText}>Clear All Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Error State ─────────────────────────────

  if (error && !loading && doctors.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={THEME.error} />
          </View>
          <Text style={styles.errorTitle}>Something Went Wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dispatch(fetchDoctors())}
          >
            <LinearGradient
              colors={THEME.gradient.primary as any}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ─────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* ── Header ───────────────────────── */}
      <LinearGradient
        colors={THEME.gradient.header as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {selectedSpecialtyName || 'Find Doctors'}
              </Text>
              <Text style={styles.headerCount}>
                {pagination.totalItems} doctors available
              </Text>
            </View>
            <View style={{ width: 42 }} />
          </View>

          {/* ── Search Bar ───────────────────── */}
          <View
            style={[
              styles.searchContainer,
              searchFocused && styles.searchContainerFocused,
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={searchFocused ? THEME.primary : Colors.text.tertiary}
            />
            <TextInput
              style={[
                styles.searchInput,
                searchFocused && styles.searchInputFocused,
              ]}
              placeholder="Search doctors by name..."
              placeholderTextColor={
                searchFocused ? Colors.text.tertiary : 'rgba(255,255,255,0.5)'
              }
              value={searchQuery}
              onChangeText={(text) => dispatch(setSearchQuery(text))}
              onSubmitEditing={handleSearchSubmit}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  dispatch(setSearchQuery(''));
                  dispatch(fetchDoctors());
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={searchFocused ? Colors.text.tertiary : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── Filter / Sort Bar ──────────────── */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={openFilterModal}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={18} color={Colors.text.primary} />
          <Text style={styles.controlButtonText}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setSortVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="sort-variant"
            size={18}
            color={Colors.text.primary}
          />
          <Text style={styles.controlButtonText}>
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* ── Doctor List ────────────────────── */}
      <Animated.View
        style={[
          styles.listContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {loading && doctors.length === 0 ? (
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <DoctorCardSkeleton />}
            keyExtractor={(item) => String(item)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={doctors}
            renderItem={renderDoctorCard}
            keyExtractor={(item) => item.doctorId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[THEME.primary]}
                tintColor={THEME.primary}
              />
            }
          />
        )}
      </Animated.View>

      {/* ── Sort Modal ─────────────────────── */}
      <Modal
        visible={sortVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortVisible(false)}
        >
          <View style={styles.sortSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sort By</Text>

            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.sortOption, isActive && styles.sortOptionActive]}
                  onPress={() => {
                    dispatch(setSorting(option.value));
                    setSortVisible(false);
                  }}
                >
                  <View style={styles.sortOptionLeft}>
                    <View
                      style={[
                        styles.sortOptionIcon,
                        isActive && styles.sortOptionIconActive,
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={16}
                        color={isActive ? THEME.primary : Colors.text.tertiary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.sortOptionText,
                        isActive && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Filter Modal ───────────────────── */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />

            {/* Filter Header */}
            <View style={styles.filterHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity
                onPress={handleClearFilters}
                style={styles.clearAllButton}
              >
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {/* Gender */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Gender Preference</Text>
                <View style={styles.filterChipRow}>
                  {(['any', 'male', 'female'] as GenderFilter[]).map((g) => (
                    <FilterChip
                      key={g}
                      label={g === 'any' ? 'Any' : g === 'male' ? 'Male' : 'Female'}
                      icon={g === 'male' ? 'male' : g === 'female' ? 'female' : undefined}
                      selected={localFilters.gender === g}
                      onPress={() => setLocalFilters((f) => ({ ...f, gender: g }))}
                    />
                  ))}
                </View>
              </View>

              {/* Availability */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Availability</Text>
                <View style={styles.filterChipRow}>
                  {([
                    { val: 'any' as AvailabilityFilter, label: 'Any Time', icon: 'calendar-outline' },
                    { val: 'today' as AvailabilityFilter, label: 'Today', icon: 'today-outline' },
                    { val: 'this-week' as AvailabilityFilter, label: 'This Week', icon: 'calendar' },
                  ]).map((a) => (
                    <FilterChip
                      key={a.val}
                      label={a.label}
                      icon={a.icon}
                      selected={localFilters.availability === a.val}
                      onPress={() => setLocalFilters((f) => ({ ...f, availability: a.val }))}
                    />
                  ))}
                </View>
              </View>

              {/* Fee Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Consultation Fee</Text>
                <View style={styles.filterChipRow}>
                  {FEE_PRESETS.map((p) => (
                    <FilterChip
                      key={p.label}
                      label={p.label}
                      selected={
                        localFilters.feeRange[0] === p.range[0] &&
                        localFilters.feeRange[1] === p.range[1]
                      }
                      onPress={() =>
                        setLocalFilters((f) => ({ ...f, feeRange: p.range }))
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Consultation Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Consultation Type</Text>
                <View style={styles.filterChipRow}>
                  {([
                    { val: 'both' as ConsultationTypeFilter, label: 'All Types', icon: 'apps-outline' },
                    { val: 'in-clinic' as ConsultationTypeFilter, label: 'In-Clinic', icon: 'business-outline' },
                    { val: 'video' as ConsultationTypeFilter, label: 'Video Call', icon: 'videocam-outline' },
                  ]).map((c) => (
                    <FilterChip
                      key={c.val}
                      label={c.label}
                      icon={c.icon}
                      selected={localFilters.consultationType === c.val}
                      onPress={() =>
                        setLocalFilters((f) => ({ ...f, consultationType: c.val }))
                      }
                    />
                  ))}
                </View>
              </View>

              {/* City */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>City / Location</Text>
                <View style={styles.filterChipRow}>
                  {CITIES.map((c) => (
                    <FilterChip
                      key={c || 'all'}
                      label={c || 'All Cities'}
                      icon={c ? 'location-outline' : undefined}
                      selected={localFilters.city === c}
                      onPress={() => setLocalFilters((f) => ({ ...f, city: c }))}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <LinearGradient
                  colors={THEME.gradient.primary as any}
                  style={styles.applyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.applyButtonText}>
                    Apply Filters
                    {activeFilterCount > 0 && ` (${activeFilterCount})`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchContainerFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  searchInputFocused: {
    color: Colors.text.primary,
  },

  // Control Bar
  controlBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  filterBadge: {
    backgroundColor: THEME.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Doctor Card
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    flexShrink: 1,
  },
  qualifications: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  feeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  videoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.accent,
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Loading
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  loadingMoreText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.primary,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  // Sort Sheet
  sortSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sortOptionActive: {
    backgroundColor: THEME.primaryLight,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomColor: 'transparent',
    borderRadius: 12,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptionIconActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  sortOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  sortOptionTextActive: {
    fontWeight: '600',
    color: THEME.primary,
  },

  // Filter Sheet
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.error,
  },
  filterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterChipSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  applyButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default DoctorListScreen;