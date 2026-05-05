import React, { useEffect, useCallback, useRef, useMemo } from 'react';
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
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchHomeData, clearError } from './healthcareHomeSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Doctor, Specialty } from '../../../../models/healthcare/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPECIALTY_CARD_WIDTH = 88;
const DOCTOR_CARD_HEIGHT = 140;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// ── Theme Colors ────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    accent: ['#5A9FFF', '#2A7FFF'],
    warm: ['#F59E0B', '#EF4444'],
  },
};

// ── Specialty Icon Map ──────────────────────

const SPECIALTY_ICONS: Record<string, { icon: string; gradient: string[] }> = {
  'stethoscope': { icon: 'stethoscope', gradient: ['#2A7FFF', '#1E6AE1'] },
  'heart-pulse': { icon: 'heart-pulse', gradient: ['#EF4444', '#DC2626'] },
  'hand': { icon: 'hand-heart', gradient: ['#2A7FFF', '#1E6AE1'] },
  'bone': { icon: 'bone', gradient: ['#5A9FFF', '#1E6AE1'] },
  'baby': { icon: 'baby-face-outline', gradient: ['#5A9FFF', '#2A7FFF'] },
  'smile': { icon: 'emoticon-happy-outline', gradient: ['#10B981', '#059669'] },
  'ear': { icon: 'ear-hearing', gradient: ['#06B6D4', '#0891B2'] },
  'brain': { icon: 'brain', gradient: ['#1857C0', '#0D4299'] },
};

const getSpecialtyConfig = (icon: string) => {
  return SPECIALTY_ICONS[icon] || { icon: 'stethoscope', gradient: ['#2A7FFF', '#1E6AE1'] };
};

// ── Quick Action Data ───────────────────────

const QUICK_ACTIONS = [
  {
    id: 'appointments',
    label: 'Appointments',
    icon: 'clipboard-list-outline',
    route: HealthcareRouteNames.MyAppointments,
    color: '#2A7FFF',
    bg: '#EAF3FF',
  },
  {
    id: 'records',
    label: 'Records',
    icon: 'file-document-outline',
    route: HealthcareRouteNames.HealthRecords,
    color: '#10B981',
    bg: '#ECFDF5',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    icon: 'ambulance',
    route: HealthcareRouteNames.Emergency,
    color: '#EF4444',
    bg: '#FEF2F2',
  },
];

// ── Skeleton Components ─────────────────────

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
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
};

const SpecialtyCardSkeleton: React.FC = () => (
  <View style={styles.specialtyCard}>
    <SkeletonBox width={60} height={60} borderRadius={20} />
    <SkeletonBox width={60} height={12} style={{ marginTop: 10 }} />
    <SkeletonBox width={45} height={10} style={{ marginTop: 6 }} />
  </View>
);

const DoctorCardSkeleton: React.FC = () => (
  <View style={styles.doctorCard}>
    <SkeletonBox width={64} height={64} borderRadius={20} />
    <View style={{ flex: 1, marginLeft: 16 }}>
      <SkeletonBox width="70%" height={16} />
      <SkeletonBox width="50%" height={12} style={{ marginTop: 8 }} />
      <SkeletonBox width="40%" height={10} style={{ marginTop: 8 }} />
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <SkeletonBox width={60} height={24} borderRadius={12} />
    </View>
  </View>
);

// ── Main Component ──────────────────────────

const HealthcareHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { featuredDoctors, specialties, loading, error } = useAppSelector(
    (state) => state.healthcareHome
  );

  const [refreshing, setRefreshing] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [searchFocused, setSearchFocused] = React.useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const staggerAnims = useRef(
    QUICK_ACTIONS.map(() => new Animated.Value(0))
  ).current;

  // Initial load animation
  useEffect(() => {
    dispatch(fetchHomeData());

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.stagger(
        80,
        staggerAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchHomeData());
    setRefreshing(false);
  }, [dispatch]);

  // Header animation based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 8],
    extrapolate: 'clamp',
  });

  // ── Handlers ────────────────────────────────

  const handleSearch = () => {
    if (searchText.trim()) {
      navigation.navigate(HealthcareRouteNames.DoctorList, {
        specialtyId: '',
        specialtyName: searchText.trim(),
      });
    }
  };

  const handleSpecialtyPress = (specialty: Specialty) => {
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: specialty.specialtyId,
      specialtyName: specialty.name,
    });
  };

  const handleDoctorPress = (doctor: Doctor) => {
    navigation.navigate(HealthcareRouteNames.DoctorDetail, {
      doctorId: doctor.doctorId,
    });
  };

  const handleQuickAction = (route: string) => {
    navigation.navigate(route as never);
  };

  const handleViewAllSpecialties = () => {
    navigation.navigate(HealthcareRouteNames.SpecialtyList as never);
  };

  const handleViewAllDoctors = () => {
    navigation.navigate(HealthcareRouteNames.DoctorList as never);
  };

  const handleVideoBanner = () => {
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: '',
      specialtyName: 'Video Consultation',
      isVideoOnly: true,
    });
  };

  // ── Specialty Card ──────────────────────────

  const renderSpecialtyCard = useCallback(
    ({ item, index }: { item: Specialty; index: number }) => {
      const config = getSpecialtyConfig(item.icon);

      return (
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.specialtyCard}
            onPress={() => handleSpecialtyPress(item)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={config.gradient as any}
              style={styles.specialtyIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons
                name={config.icon as any}
                size={26}
                color="#FFFFFF"
              />
            </LinearGradient>
            <Text style={styles.specialtyName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.specialtyCountBadge}>
              <Text style={styles.specialtyCount}>{item.doctorCount}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [fadeAnim]
  );

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
                translateX: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
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
            {/* Avatar Section */}
            <View style={styles.doctorAvatarWrapper}>
              <LinearGradient
                colors={[THEME.primaryLight, '#F0F7FF']}
                style={styles.doctorAvatar}
              >
                <MaterialCommunityIcons
                  name="doctor"
                  size={32}
                  color={THEME.primary}
                />
              </LinearGradient>
              {item.isAvailable && (
                <View style={styles.availabilityBadge}>
                  <View style={styles.availabilityDot} />
                </View>
              )}
              {item.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
                </View>
              )}
            </View>

            {/* Info Section */}
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName} numberOfLines={1}>
                  Dr. {doctorName}
                </Text>
              </View>

              <Text style={styles.doctorSpecialty} numberOfLines={1}>
                {item.qualifications?.join(' • ') || 'Specialist'}
              </Text>

              <View style={styles.doctorMetaRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '4.5'}</Text>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.experienceBadge}>
                  <MaterialCommunityIcons
                    name="briefcase-outline"
                    size={12}
                    color={Colors.text.secondary}
                  />
                  <Text style={styles.experienceText}>
                    {item.experience || '5'}+ yrs
                  </Text>
                </View>

                {item.totalPatients && (
                  <>
                    <View style={styles.metaDivider} />
                    <View style={styles.patientsBadge}>
                      <Ionicons
                        name="people-outline"
                        size={12}
                        color={Colors.text.secondary}
                      />
                      <Text style={styles.patientsText}>
                        {item.totalPatients > 999
                          ? `${(item.totalPatients / 1000).toFixed(1)}k`
                          : item.totalPatients}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Fee & Action Section */}
            <View style={styles.doctorActionSection}>
              <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>Fee</Text>
                <Text style={styles.feeAmount}>
                  Rs. {item.consultationFee || '1500'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => handleDoctorPress(item)}
              >
                <LinearGradient
                  colors={THEME.gradient.primary as any}
                  style={styles.bookButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.bookButtonText}>Book</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [fadeAnim]
  );

  // ── Quick Action Card ───────────────────────

  const renderQuickAction = (action: typeof QUICK_ACTIONS[0], index: number) => {
    const scale = staggerAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <Animated.View
        key={action.id}
        style={{
          opacity: staggerAnims[index],
          transform: [{ scale }],
        }}
      >
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => handleQuickAction(action.route)}
          activeOpacity={0.85}
        >
          <View style={[styles.quickActionIconBg, { backgroundColor: action.bg }]}>
            <MaterialCommunityIcons
              name={action.icon as any}
              size={24}
              color={action.color}
            />
          </View>
          <Text style={styles.quickActionLabel}>{action.label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Error State ─────────────────────────────

  if (error && !loading && specialties.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <View style={[styles.errorContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.errorIconContainer}
          >
            <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>
            We couldn't load your healthcare data. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              dispatch(clearError());
              dispatch(fetchHomeData());
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={THEME.gradient.primary as any}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Render ─────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} translucent />

      {/* Floating Header on Scroll */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            shadowOpacity: headerElevation.interpolate({
              inputRange: [0, 8],
              outputRange: [0, 0.1],
            }),
          },
        ]}
      >
        <Text style={styles.floatingHeaderTitle}>Healthcare</Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.primary]}
            tintColor={THEME.primary}
            progressViewOffset={20}
          />
        }
      >
        {/* ── Header Section ──────────────────── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#2A7FFF', '#1857C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                <Text style={styles.headerTitle}>Find Your Doctor</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Search Bar ──────────────────────── */}
        <Animated.View
          style={[
            styles.searchWrapper,
            { opacity: fadeAnim },
            searchFocused && styles.searchWrapperFocused,
          ]}
        >
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Ionicons
              name="search-outline"
              size={20}
              color={searchFocused ? THEME.primary : Colors.text.tertiary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctors, specialties, symptoms..."
              placeholderTextColor={Colors.text.tertiary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.searchClearButton}
              >
                <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
          {searchFocused && (
            <TouchableOpacity style={styles.searchFilterButton}>
              <Ionicons name="options-outline" size={20} color={THEME.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Specialties Section ─────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Medical Specialties</Text>
              <Text style={styles.sectionSubtitle}>
                {specialties.length} specialties available
              </Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={handleViewAllSpecialties}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.primary} />
            </TouchableOpacity>
          </View>

          {loading && specialties.length === 0 ? (
            <FlatList
              data={[1, 2, 3, 4, 5]}
              renderItem={() => <SpecialtyCardSkeleton />}
              keyExtractor={(item) => `skeleton-${item}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialtiesList}
            />
          ) : (
            <FlatList
              data={specialties}
              renderItem={renderSpecialtyCard}
              keyExtractor={(item) => item.specialtyId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialtiesList}
            />
          )}
        </View>

        {/* ── Video Consultation Banner ───────── */}
        <TouchableOpacity
          style={styles.bannerContainer}
          onPress={handleVideoBanner}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#1E6AE1', '#2A7FFF', '#5A9FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextGroup}>
                <View style={styles.bannerBadge}>
                  <MaterialCommunityIcons name="video" size={12} color="#FFFFFF" />
                  <Text style={styles.bannerBadgeText}>VIDEO CONSULT</Text>
                </View>
                <Text style={styles.bannerTitle}>Consult from Home</Text>
                <Text style={styles.bannerSubtitle}>
                  Connect with verified doctors instantly via secure video call
                </Text>
                <View style={styles.bannerFeatures}>
                  <View style={styles.bannerFeature}>
                    <Ionicons name="checkmark-circle" size={14} color="#A5F3FC" />
                    <Text style={styles.bannerFeatureText}>24/7 Available</Text>
                  </View>
                  <View style={styles.bannerFeature}>
                    <Ionicons name="checkmark-circle" size={14} color="#A5F3FC" />
                    <Text style={styles.bannerFeatureText}>Secure & Private</Text>
                  </View>
                </View>
                <View style={styles.bannerCTA}>
                  <Text style={styles.bannerCTAText}>Start Consultation</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1857C0" />
                </View>
              </View>
              <View style={styles.bannerIllustration}>
                <View style={styles.bannerIconWrapper}>
                  <MaterialCommunityIcons
                    name="video-account"
                    size={56}
                    color="rgba(255,255,255,0.25)"
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Featured Doctors Section ─────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Top-Rated Doctors</Text>
              <Text style={styles.sectionSubtitle}>
                Based on patient reviews & experience
              </Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={handleViewAllDoctors}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.primary} />
            </TouchableOpacity>
          </View>

          {loading && featuredDoctors.length === 0 ? (
            <>
              <DoctorCardSkeleton />
              <DoctorCardSkeleton />
              <DoctorCardSkeleton />
            </>
          ) : (
            featuredDoctors.map((doctor, index) => (
              <View key={doctor.doctorId}>
                {renderDoctorCard({ item: doctor, index })}
              </View>
            ))
          )}
        </View>

        {/* ── Health Tips Card ─────────────────── */}
        <View style={styles.healthTipsSection}>
          <LinearGradient
            colors={['#ECFDF5', '#D1FAE5']}
            style={styles.healthTipsCard}
          >
            <View style={styles.healthTipsIcon}>
              <MaterialCommunityIcons
                name="heart-pulse"
                size={24}
                color={THEME.success}
              />
            </View>
            <View style={styles.healthTipsContent}>
              <Text style={styles.healthTipsTitle}>Daily Health Tip</Text>
              <Text style={styles.healthTipsText}>
                Regular health checkups can help detect potential issues early.
                Schedule your annual checkup today!
              </Text>
            </View>
            <TouchableOpacity style={styles.healthTipsAction}>
              <Ionicons name="chevron-forward" size={20} color={THEME.success} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Bottom Safe Area */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge,
  },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: STATUS_BAR_HEIGHT,
    height: 60 + STATUS_BAR_HEIGHT,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  floatingHeaderTitle: {
    ...Typography.title.medium,
    color: Colors.text.primary,
  },

  // Header
  header: {
    paddingTop: 0,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    zIndex: 1,
  },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  searchWrapperFocused: {
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  searchContainerFocused: {
    borderColor: THEME.primary,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  searchClearButton: {
    padding: 4,
  },
  searchFilterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${THEME.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  quickActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${THEME.primary}08`,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Specialties
  specialtiesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  specialtyCard: {
    width: SPECIALTY_CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
  },
  specialtyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  specialtyName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  specialtyCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  specialtyCount: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Banner
  bannerContainer: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#2A7FFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bannerGradient: {
    padding: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },

  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 12,
  },
  bannerFeatures: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  bannerFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerFeatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A5F3FC',
  },
  bannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bannerCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1857C0',
  },
  bannerIllustration: {
    marginLeft: 16,
  },
  bannerIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Doctor Card
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  doctorAvatarWrapper: {
    position: 'relative',
  },
  doctorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.success,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  doctorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  experienceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  patientsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  patientsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  doctorActionSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  feeAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.primary,
  },
  bookButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Health Tips
  healthTipsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  healthTipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
  },
  healthTipsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthTipsContent: {
    flex: 1,
    marginLeft: 12,
  },
  healthTipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  healthTipsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#047857',
    lineHeight: 16,
  },
  healthTipsAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default HealthcareHomeScreen;