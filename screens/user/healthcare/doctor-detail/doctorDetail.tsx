import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Linking,
  Platform,
  Animated,
  Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchDoctorDetail,
  fetchDoctorReviews,
  setActiveTab,
  clearDoctor,
  toggleFavorite,
  selectIsLoading,
  selectDoctor,
  selectReviews,
  selectClinics,
  selectActiveTab,
} from './doctorDetailSlice';
import type { DetailTab } from './doctorDetailSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Clinic, DoctorReview } from '../../../../models/healthcare/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 280;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

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
    book: ['#10B981', '#059669'],
  },
};

// ── Tab Config ──────────────────────────────

const TABS: { key: DetailTab; label: string; icon: string }[] = [
  { key: 'about', label: 'About', icon: 'person-outline' },
  { key: 'reviews', label: 'Reviews', icon: 'chatbubble-outline' },
  { key: 'locations', label: 'Clinics', icon: 'location-outline' },
];

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

// ── Star Rating Component ───────────────────

const StarRating: React.FC<{ rating: number; size?: number; showValue?: boolean }> = ({
  rating,
  size = 14,
  showValue = false,
}) => (
  <View style={styles.starsRow}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={i < Math.round(rating) ? THEME.star : '#CBD5E1'}
      />
    ))}
    {showValue && (
      <Text style={[styles.starValueText, { fontSize: size }]}>{rating.toFixed(1)}</Text>
    )}
  </View>
);

// ── Main Component ──────────────────────────

const DoctorDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const [refreshing, setRefreshing] = useState(false);

  const doctor = useAppSelector(selectDoctor);
  const reviews = useAppSelector(selectReviews);
  const clinics = useAppSelector(selectClinics);
  const activeTab = useAppSelector(selectActiveTab);
  const loading = useAppSelector(selectIsLoading);
  const {
    reviewsLoading,
    error,
    reviewsError,
    reviewsPagination,
    isFavorite,
  } = useAppSelector((s) => s.doctorDetail);

  const doctorId: string = route.params?.doctorId ?? '';

  // ── Animations ────────────────────────────

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

    setTimeout(() => {
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);
  }, []);

  // Header animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ── Lifecycle ─────────────────────────────

  useEffect(() => {
    if (doctorId) {
      dispatch(fetchDoctorDetail(doctorId));
      dispatch(fetchDoctorReviews({ doctorId }));
    }
    return () => {
      dispatch(clearDoctor());
    };
  }, [doctorId, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchDoctorDetail(doctorId)),
      dispatch(fetchDoctorReviews({ doctorId })),
    ]);
    setRefreshing(false);
  }, [dispatch, doctorId]);

  const handleBack = () => navigation.goBack();

  const handleBookAppointment = () => {
    navigation.navigate(HealthcareRouteNames.BookAppointment, { doctorId });
  };

  const handleShare = async () => {
    if (!doctor) return;
    try {
      await Share.share({
        message: `Check out Dr. ${doctor.bio?.split(' ')[1] || 'Doctor'} on Smart City Healthcare App`,
        title: 'Share Doctor Profile',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleFavoriteToggle = () => {
    dispatch(toggleFavorite());
  };

  const handleLoadMoreReviews = () => {
    if (!reviewsLoading && reviewsPagination.hasNext) {
      dispatch(
        fetchDoctorReviews({
          doctorId,
          page: reviewsPagination.currentPage + 1,
        })
      );
    }
  };

  const openMap = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  const callClinic = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleViewAllReviews = () => {
    navigation.navigate(HealthcareRouteNames.DoctorReviews, {
      doctorId,
      doctorName: doctor?.bio?.split(' ')[1] || 'Doctor',
    });
  };

  // ── Loading State ─────────────────────────

  if (loading && !doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />
        <LinearGradient
          colors={THEME.gradient.header as any}
          style={styles.loadingHeader}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContent}>
          <SkeletonBox width={100} height={100} borderRadius={32} />
          <SkeletonBox width="60%" height={24} style={{ marginTop: 16 }} />
          <SkeletonBox width="40%" height={16} style={{ marginTop: 8 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <SkeletonBox width={100} height={60} borderRadius={16} />
            <SkeletonBox width={100} height={60} borderRadius={16} />
            <SkeletonBox width={100} height={60} borderRadius={16} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error State ───────────────────────────

  if (error && !doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={THEME.error} />
          </View>
          <Text style={styles.errorTitle}>Couldn't Load Profile</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dispatch(fetchDoctorDetail(doctorId))}
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

  if (!doctor) return null;

  const doctorName = doctor.bio?.split(' ')[1] || 'Doctor';

  // ── Profile Header ────────────────────────

  const renderProfileHeader = () => (
    <Animated.View style={[styles.profileHeader, { opacity: headerOpacity }]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F1F5F9']}
          style={styles.avatar}
        >
          <MaterialCommunityIcons
            name="doctor"
            size={48}
            color={THEME.primary}
          />
        </LinearGradient>
        {doctor.isAvailable && <View style={styles.onlineDot} />}
        {doctor.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />
          </View>
        )}
      </View>

      {/* Name & Info */}
      <Text style={styles.doctorName}>Dr. {doctorName}</Text>
      <Text style={styles.qualifications}>
        {doctor.qualifications?.join(', ') || 'Specialist'}
      </Text>
      <Text style={styles.subspecialty}>
        {doctor.subspecialties?.join(' · ') || 'General Practice'}
      </Text>

      {/* Rating Badge */}
      <View style={styles.ratingContainer}>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={THEME.star} />
          <Text style={styles.ratingValue}>{doctor.rating?.toFixed(1) || '4.5'}</Text>
        </View>
        <Text style={styles.reviewCount}>
          ({doctor.totalReviews || 0} reviews)
        </Text>
      </View>
    </Animated.View>
  );

  // ── Stats Row ─────────────────────────────

  const renderStatsRow = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <View style={[styles.statIconBg, { backgroundColor: '#EAF3FF' }]}>
          <MaterialCommunityIcons
            name="briefcase-outline"
            size={18}
            color={THEME.primary}
          />
        </View>
        <Text style={styles.statValue}>{doctor.experience || '5'}+</Text>
        <Text style={styles.statLabel}>Years Exp.</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIconBg, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="people-outline" size={18} color={THEME.success} />
        </View>
        <Text style={styles.statValue}>
          {doctor.totalPatients > 999
            ? `${(doctor.totalPatients / 1000).toFixed(1)}k`
            : doctor.totalPatients || '500+'}
        </Text>
        <Text style={styles.statLabel}>Patients</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="chatbubbles-outline" size={18} color={THEME.warning} />
        </View>
        <Text style={styles.statValue}>{doctor.totalReviews || '0'}</Text>
        <Text style={styles.statLabel}>Reviews</Text>
      </View>
    </View>
  );

  // ── Tab Bar ───────────────────────────────

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => dispatch(setActiveTab(tab.key))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={active ? THEME.primary : Colors.text.tertiary}
            />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === 'reviews' && reviews.length > 0 && (
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text
                  style={[
                    styles.tabBadgeText,
                    active && styles.tabBadgeTextActive,
                  ]}
                >
                  {reviews.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── About Tab ─────────────────────────────

  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      {/* Bio Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBg, { backgroundColor: '#EAF3FF' }]}>
            <Ionicons name="person-outline" size={16} color={THEME.primary} />
          </View>
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <Text style={styles.bioText}>{doctor.bio}</Text>
      </View>

      {/* Qualifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBg, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="school-outline" size={16} color={THEME.success} />
          </View>
          <Text style={styles.sectionTitle}>Education & Qualifications</Text>
        </View>
        {doctor.qualifications?.map((q, index) => (
          <View key={index} style={styles.qualificationRow}>
            <View style={styles.qualificationDot} />
            <Text style={styles.qualificationText}>{q}</Text>
          </View>
        ))}
      </View>

      {/* Specializations */}
      {doctor.subspecialties?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#EAF3FF' }]}>
              <MaterialCommunityIcons
                name="stethoscope"
                size={16}
                color={THEME.accent}
              />
            </View>
            <Text style={styles.sectionTitle}>Specializations</Text>
          </View>
          <View style={styles.chipContainer}>
            {doctor.subspecialties.map((s, index) => (
              <View key={index} style={styles.specChip}>
                <Text style={styles.specChipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Registration */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBg, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={THEME.success}
            />
          </View>
          <Text style={styles.sectionTitle}>Registration</Text>
        </View>
        <View style={styles.registrationCard}>
          <MaterialCommunityIcons
            name="certificate-outline"
            size={20}
            color={THEME.primary}
          />
          <View style={styles.registrationInfo}>
            <Text style={styles.registrationLabel}>PMC Registration</Text>
            <Text style={styles.registrationValue}>
              {doctor.pmcNumber || 'N/A'}
            </Text>
          </View>
          <View style={styles.verifiedTag}>
            <Ionicons name="checkmark-circle" size={12} color={THEME.success} />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        </View>
      </View>

      {/* Languages */}
      {doctor.languages?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons
                name="translate"
                size={16}
                color={THEME.warning}
              />
            </View>
            <Text style={styles.sectionTitle}>Languages</Text>
          </View>
          <View style={styles.chipContainer}>
            {doctor.languages.map((lang, index) => (
              <View key={index} style={styles.langChip}>
                <Text style={styles.langChipText}>{lang}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Awards */}
      {doctor.awards?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="trophy-outline" size={16} color={THEME.warning} />
            </View>
            <Text style={styles.sectionTitle}>Awards & Recognition</Text>
          </View>
          {doctor.awards.map((award, index) => (
            <View key={index} style={styles.awardRow}>
              <Ionicons name="ribbon-outline" size={16} color={THEME.warning} />
              <Text style={styles.awardText}>{award}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Fee Card */}
      <View style={styles.feeCard}>
        <Text style={styles.feeCardTitle}>Consultation Fees</Text>
        <View style={styles.feeRow}>
          <View style={styles.feeIconBg}>
            <MaterialCommunityIcons
              name="stethoscope"
              size={18}
              color={THEME.primary}
            />
          </View>
          <View style={styles.feeInfo}>
            <Text style={styles.feeLabel}>In-Clinic Consultation</Text>
            <Text style={styles.feeDescription}>Visit the clinic</Text>
          </View>
          <Text style={styles.feeAmount}>Rs. {doctor.consultationFee}</Text>
        </View>

        {doctor.videoConsultationFee > 0 && (
          <>
            <View style={styles.feeDivider} />
            <View style={styles.feeRow}>
              <View style={[styles.feeIconBg, { backgroundColor: '#EAF3FF' }]}>
                <MaterialCommunityIcons
                  name="video-outline"
                  size={18}
                  color={THEME.accent}
                />
              </View>
              <View style={styles.feeInfo}>
                <Text style={styles.feeLabel}>Video Consultation</Text>
                <Text style={styles.feeDescription}>Consult from home</Text>
              </View>
              <Text style={styles.feeAmount}>
                Rs. {doctor.videoConsultationFee}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  // ── Reviews Tab ───────────────────────────

  const renderReviewItem = (review: DoctorReview, index: number) => {
    const reviewDate = new Date(review.createdAt);
    const isRecent =
      Date.now() - reviewDate.getTime() < 7 * 24 * 60 * 60 * 1000;

    return (
      <View key={review.reviewId} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewAvatarText}>
              {review.isAnonymous ? 'A' : 'P'}
            </Text>
          </View>
          <View style={styles.reviewMeta}>
            <View style={styles.reviewAuthorRow}>
              <Text style={styles.reviewAuthor}>
                {review.isAnonymous ? 'Anonymous' : 'Verified Patient'}
              </Text>
              {!review.isAnonymous && (
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={THEME.success}
                />
              )}
            </View>
            <View style={styles.reviewDateRow}>
              <Text style={styles.reviewDate}>
                {reviewDate.toLocaleDateString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              {isRecent && (
                <View style={styles.recentBadge}>
                  <Text style={styles.recentBadgeText}>Recent</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.reviewRatingBadge}>
            <Ionicons name="star" size={12} color={THEME.star} />
            <Text style={styles.reviewRatingText}>{review.rating}</Text>
          </View>
        </View>

        <Text style={styles.reviewComment}>{review.comment}</Text>

        {review.response && (
          <View style={styles.doctorResponse}>
            <View style={styles.responseHeader}>
              <View style={styles.responseIconBg}>
                <MaterialCommunityIcons
                  name="stethoscope"
                  size={12}
                  color={THEME.primary}
                />
              </View>
              <Text style={styles.responseLabel}>Doctor's Response</Text>
            </View>
            <Text style={styles.responseText}>{review.response.text}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {reviews.length === 0 && !reviewsLoading ? (
        <View style={styles.emptySection}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={40}
              color="#94A3B8"
            />
          </View>
          <Text style={styles.emptyTitle}>No Reviews Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to share your experience
          </Text>
        </View>
      ) : (
        <>
          {/* Review Summary */}
          <View style={styles.reviewSummary}>
            <View style={styles.reviewSummaryLeft}>
              <Text style={styles.reviewSummaryRating}>
                {doctor.rating?.toFixed(1) || '0.0'}
              </Text>
              <StarRating rating={doctor.rating || 0} size={16} />
              <Text style={styles.reviewSummaryCount}>
                {doctor.totalReviews || 0} reviews
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllReviews}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={THEME.primary} />
            </TouchableOpacity>
          </View>

          {/* Review List */}
          {reviews.slice(0, 3).map(renderReviewItem)}

          {reviews.length > 3 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={handleViewAllReviews}
            >
              <Text style={styles.showMoreText}>
                See all {doctor.totalReviews} reviews
              </Text>
              <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
            </TouchableOpacity>
          )}
        </>
      )}

      {reviewsError && (
        <Text style={styles.reviewsErrorText}>{reviewsError}</Text>
      )}
    </View>
  );

  // ── Locations Tab ─────────────────────────

  const renderClinicCard = (clinic: Clinic, index: number) => {
    const openDays = clinic.timings?.filter((t) => t.isOpen) || [];
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayTiming = openDays.find(
      (t) => t.day.toLowerCase() === todayName.toLowerCase()
    );

    return (
      <View key={clinic.clinicId} style={styles.clinicCard}>
        {/* Clinic Header */}
        <View style={styles.clinicHeader}>
          <View style={styles.clinicIconBg}>
            <Ionicons name="business-outline" size={20} color={THEME.primary} />
          </View>
          <View style={styles.clinicHeaderInfo}>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            {todayTiming && (
              <View style={styles.openNowBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openNowText}>Open Today</Text>
              </View>
            )}
          </View>
        </View>

        {/* Address */}
        <View style={styles.clinicInfoRow}>
          <Ionicons name="location-outline" size={16} color={Colors.text.tertiary} />
          <Text style={styles.clinicAddress}>
            {clinic.address}, {clinic.city}
          </Text>
        </View>

        {/* Today's Timing */}
        {todayTiming && (
          <View style={styles.clinicInfoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.clinicTiming}>
              {todayTiming.openTime} - {todayTiming.closeTime}
            </Text>
          </View>
        )}

        {/* Amenities */}
        {clinic.amenities?.length > 0 && (
          <View style={styles.amenitiesContainer}>
            {clinic.amenities.slice(0, 4).map((amenity, i) => (
              <View key={i} style={styles.amenityChip}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={THEME.success}
                />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
            {clinic.amenities.length > 4 && (
              <View style={styles.amenityMore}>
                <Text style={styles.amenityMoreText}>
                  +{clinic.amenities.length - 4}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.clinicActions}>
          <TouchableOpacity
            style={styles.clinicActionButton}
            onPress={() => callClinic(clinic.phone)}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="call" size={16} color={THEME.success} />
            </View>
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clinicActionButton}
            onPress={() =>
              openMap(clinic.coordinates.lat, clinic.coordinates.lng)
            }
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#EAF3FF' }]}>
              <Ionicons name="navigate" size={16} color={THEME.primary} />
            </View>
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clinicActionButton}
            onPress={handleBookAppointment}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#EAF3FF' }]}>
              <Ionicons name="calendar" size={16} color={THEME.accent} />
            </View>
            <Text style={styles.actionText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLocationsTab = () => (
    <View style={styles.tabContent}>
      {clinics.length === 0 ? (
        <View style={styles.emptySection}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="business-outline" size={40} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Clinic Locations</Text>
          <Text style={styles.emptySubtitle}>
            Contact the doctor for location details
          </Text>
        </View>
      ) : (
        clinics.map(renderClinicCard)
      )}
    </View>
  );

  // ── Tab Content Router ────────────────────

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'reviews':
        return renderReviewsTab();
      case 'locations':
        return renderLocationsTab();
    }
  };

  // ── Main Render ───────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={THEME.gradient.header as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        >
        </LinearGradient>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Animated.Text
            style={[styles.topBarTitle, { opacity: headerTitleOpacity }]}
            numberOfLines={1}
          >
            Dr. {doctorName}
          </Animated.Text>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              onPress={handleFavoriteToggle}
              style={styles.topBarButton}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#EF4444' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.topBarButton}>
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {renderProfileHeader()}
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
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
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
      >
        <View style={{ height: HEADER_MAX_HEIGHT - 40 }} />
        {renderStatsRow()}
        {renderTabBar()}
        {renderActiveTab()}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Floating Book Button */}
      <Animated.View
        style={[
          styles.floatingFooter,
          { transform: [{ scale: fabScale }] },
        ]}
      >
        <View style={styles.footerContent}>
          <View style={styles.footerFeeInfo}>
            <Text style={styles.footerFeeLabel}>Consultation Fee</Text>
            <Text style={styles.footerFeeAmount}>
              Rs. {doctor.consultationFee}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleBookAppointment}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={THEME.gradient.book as any}
              style={styles.bookButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              <Text style={styles.bookButtonText}>Book Appointment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    height: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 56 : 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.success,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  qualifications: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  subspecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starValueText: {
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 6,
  },

  // Content
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: THEME.primaryLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: THEME.primary,
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeActive: {
    backgroundColor: THEME.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Tab Content
  tabContent: {
    paddingBottom: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  bioText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 22,
  },

  // Qualifications
  qualificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  qualificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  qualificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },

  // Chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  specChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  langChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Registration Card
  registrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  registrationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  registrationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  registrationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.success,
  },

  // Awards
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  awardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },

  // Fee Card
  feeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  feeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  feeDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  // Reviews
  reviewSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewSummaryLeft: {
    alignItems: 'flex-start',
  },
  reviewSummaryRating: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 38,
  },
  reviewSummaryCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reviewDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  recentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.success,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewComment: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  doctorResponse: {
    marginTop: 12,
    backgroundColor: THEME.primaryLight,
    borderRadius: 12,
    padding: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  responseIconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  responseText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.primaryLight,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
  reviewsErrorText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.error,
    textAlign: 'center',
    marginTop: 12,
  },

  // Clinic Card
  clinicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  clinicIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clinicName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  openNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  openNowText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.success,
  },
  clinicInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  clinicAddress: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  clinicTiming: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.success,
  },
  amenityMore: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  clinicActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  clinicActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Empty
  emptySection: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },

  // Floating Footer
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  footerFeeInfo: {
    marginRight: 16,
  },
  footerFeeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  footerFeeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 2,
  },
  bookButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Loading
  loadingHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingHorizontal: 16,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
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
});

export default DoctorDetailScreen;