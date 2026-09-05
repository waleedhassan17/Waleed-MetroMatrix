import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { useTheme } from '../../../../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchHomeData, clearError } from './healthcareHomeSlice';
import type { HealthcareHomeState } from './healthcareHomeSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Doctor, Specialty, Appointment } from '../../../../models/healthcare/types';
import DoctorCard from '../../../../components/Healthcare/DoctorCard';
import MiniWalletCard from '../../../../components/MiniWalletCard/MiniWalletCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPECIALTY_CARD_WIDTH = 88;
const DOCTOR_CARD_HEIGHT = 140;

// ── Theme Colors ────────────────────────────

// A function of the mode. Light returns exactly the literals this block
// always held; dark is derived by role — see constants/darkShift.ts.
const makeTHEME = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);
  return {
  primary: hue('#2A7FFF'),
  primaryDark: hue('#1E6AE1'),
  primaryLight: ground('#EAF3FF', '#2A7FFF'),
  accent: hue('#5A9FFF'),
  success: hue('#10B981'),
  warning: hue('#F59E0B'),
  gradient: {
    primary: grad(['#2A7FFF', '#1857C0']),
    accent: grad(['#5A9FFF', '#2A7FFF']),
    warm: grad(['#F59E0B', '#EF4444']),
  },
  };
};

// ── Specialty Icon Map ──────────────────────

// Gradients per specialty. A function of the mode: a ramp tuned for a white
// page is a lamp on a dark one, so `grad` walks it down toward the surface.
const makeSpecialtyIcons = (
  sh: DarkShift,
): Record<string, { icon: string; gradient: string[] }> => ({
  'stethoscope': { icon: 'stethoscope', gradient: sh.grad(['#2A7FFF', '#1E6AE1']) },
  'heart-pulse': { icon: 'heart-pulse', gradient: sh.grad(['#EF4444', '#DC2626']) },
  'hand': { icon: 'hand-heart', gradient: sh.grad(['#2A7FFF', '#1E6AE1']) },
  'bone': { icon: 'bone', gradient: sh.grad(['#5A9FFF', '#1E6AE1']) },
  'baby': { icon: 'baby-face-outline', gradient: sh.grad(['#5A9FFF', '#2A7FFF']) },
  'smile': { icon: 'emoticon-happy-outline', gradient: sh.grad(['#10B981', '#059669']) },
  'ear': { icon: 'ear-hearing', gradient: sh.grad(['#06B6D4', '#0891B2']) },
  'brain': { icon: 'brain', gradient: sh.grad(['#1857C0', '#0D4299']) },
});

const getSpecialtyConfig = (icon: string, sh: DarkShift) => {
  const icons = makeSpecialtyIcons(sh);
  return icons[icon] || { icon: 'stethoscope', gradient: sh.grad(['#2A7FFF', '#1E6AE1']) };
};

// ── Quick Action Data ───────────────────────

// The tiles' pale grounds are the thing that reads as white plates on a dark
// page, so the table varies with the mode like every other palette here.
const makeQuickActions = (sh: DarkShift) => [
  {
    id: 'appointments',
    label: 'Appointments',
    icon: 'clipboard-list-outline',
    route: HealthcareRouteNames.MyAppointments,
    color: sh.hue('#2A7FFF'),
    bg: sh.ground('#EAF3FF', '#2A7FFF'),
  },
  {
    id: 'records',
    label: 'Records',
    icon: 'file-document-outline',
    route: HealthcareRouteNames.HealthRecords,
    color: sh.hue('#10B981'),
    bg: sh.ground('#ECFDF5', '#10B981'),
  },
  {
    id: 'emergency',
    label: 'Emergency',
    icon: 'ambulance',
    route: HealthcareRouteNames.Emergency,
    color: sh.hue('#EF4444'),
    bg: sh.ground('#FEF2F2', '#EF4444'),
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    icon: 'pill',
    route: HealthcareRouteNames.MyPrescriptions,
    color: sh.hue('#8B5CF6'),
    bg: sh.ground('#EDE9FE', '#8B5CF6'),
  },
  {
    id: 'symptom-checker',
    label: 'Symptom Check',
    icon: 'stethoscope',
    route: HealthcareRouteNames.SymptomChecker,
    color: sh.hue('#F59E0B'),
    bg: sh.ground('#FEF3C7', '#F59E0B'),
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

const SpecialtyCardSkeleton: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const QUICK_ACTIONS = useMemo(() => makeQuickActions(sh), [sh]);

  return (
  <View style={styles.specialtyCard}>
    <SkeletonBox width={60} height={60} borderRadius={20} />
    <SkeletonBox width={60} height={12} style={{ marginTop: 10 }} />
    <SkeletonBox width={45} height={10} style={{ marginTop: 6 }} />
  </View>
  );
};

const DoctorCardSkeleton: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const QUICK_ACTIONS = useMemo(() => makeQuickActions(sh), [sh]);

  return (
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
};

// ── Main Component ──────────────────────────

const HealthcareHomeScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const QUICK_ACTIONS = useMemo(() => makeQuickActions(sh), [sh]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { featuredDoctors, specialties, nextAppointment, loading, error } = useAppSelector(
    (state) => state.healthcareHome
  ) as HealthcareHomeState;

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

  // This screen is the healthcare module's landing page, reached by pushing the
  // healthcare stack from the main app, so its back control is the way OUT of
  // the vertical — unlike the peer tabs, where back would mean nothing.
  //
  // It used to be hidden unless `navigation.canGoBack()` said otherwise, which
  // failed twice over. The value was read once during render and never
  // recomputed, so it could go stale; and after finishing a booking,
  // appointmentConfirm `reset`s the stack to the tab shell, which genuinely
  // leaves no history — so the one control that leaves healthcare disappeared
  // exactly when the user had finished what they came to do.
  //
  // It names its destination instead of calling `goBack()`. This screen is a
  // tab inside a stack inside the root stack, and `goBack` is resolved by
  // whichever navigator in that chain decides it can handle it — so what the
  // one control that leaves healthcare actually did depended on tab history.
  // Naming the module chooser makes it the same action every time, and
  // `navigate` pops back to it when it is already below rather than stacking a
  // second copy.
  const handleBack = () => {
    navigation.navigate('UserHome');
  };

  const handleSearch = () => {
    const query = searchText.trim();
    if (!query) return;
    // The typed text is a search query, not a specialty label. Passing it as
    // `specialtyName` only relabelled the header while the list stayed
    // unfiltered — the query has to reach the list's search state to do
    // anything.
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: '',
      specialtyName: '',
      searchQuery: query,
    });
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
      const config = getSpecialtyConfig(item.icon, sh);

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
    ({ item }: { item: Doctor; index: number }) => (
      <Animated.View
        style={{
          marginHorizontal: 20,
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
        <DoctorCard doctor={item} onPress={handleDoctorPress} onBook={handleDoctorPress} />
      </Animated.View>
    ),
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
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={Colors.surface} />
        <View style={[styles.errorContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <LinearGradient
            colors={sh.grad(['#FEE2E2', '#FECACA'])}
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

      {/* Floating Header on Scroll.

          `pointerEvents="none"` is what makes the back button below work. This
          bar is absolutely positioned across the top at zIndex 100 and is
          `opacity: 0` until you scroll — but opacity does not affect hit
          testing, so an invisible white rectangle 60pt tall was sitting over
          the header and swallowing every tap on the back control. It holds a
          title and nothing else, so it should never take a touch at all. */}
      <Animated.View
        pointerEvents="none"
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
            colors={sh.grad(['#2A7FFF', '#1857C0'])}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <BackButton tone="onAccent" onPress={handleBack} />
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerTitle}>Find Your Doctor</Text>
                <Text style={styles.headerSubtitle}>Book appointments with top specialists</Text>
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
              placeholder="Search doctors..."
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
            <TouchableOpacity
              style={styles.searchFilterButton}
              onPress={() => navigation.navigate(HealthcareRouteNames.DoctorSearch)}
            >
              <Ionicons name="options-outline" size={20} color={THEME.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Wallet — one component, one data source, everywhere (W2 Part 4) */}
        <MiniWalletCard onPress={() => (navigation as any).navigate('WalletScreen')} />

        {/* ── Quick Actions ──────────────────── */}
        <View style={styles.quickActionsContainer}>
          {/* Five cards were laid out as a flex:1 row, so each one sized to
              whatever space was left — the labels are different lengths, so
              the cards came out different widths and the last one ran off the
              screen with no way to reach it. Fixed-width cards in a horizontal
              scroller keep them identical and all reachable. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsGrid}
          >
            {QUICK_ACTIONS.map((action, index) => renderQuickAction(action, index))}
          </ScrollView>
        </View>

        {/* ── Trust Stats Bar ──────────────────── */}
        <View style={styles.trustBar}>
          <View style={styles.trustItem}>
            <View style={[styles.trustIconBg, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
              <Ionicons name="people" size={16} color="#2A7FFF" />
            </View>
            <View>
              <Text style={styles.trustValue}>50,000+</Text>
              <Text style={styles.trustLabel}>Patients</Text>
            </View>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <View style={[styles.trustIconBg, { backgroundColor: sh.ground('#ECFDF5', '#10B981') }]}>
              <MaterialCommunityIcons name="doctor" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.trustValue}>200+</Text>
              <Text style={styles.trustLabel}>Doctors</Text>
            </View>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <View style={[styles.trustIconBg, { backgroundColor: sh.ground('#FFFBEB', '#F59E0B') }]}>
              <Ionicons name="star" size={16} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.trustValue}>4.8</Text>
              <Text style={styles.trustLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* ── Upcoming Appointment Card ────────── */}
        {nextAppointment && (
          <TouchableOpacity
            style={styles.upcomingCard}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate(HealthcareRouteNames.AppointmentDetail, {
                appointmentId: nextAppointment.appointmentId,
              })
            }
          >
            <LinearGradient
              colors={nextAppointment.type === 'video' ? ['#5A9FFF', '#1E6AE1'] : ['#2A7FFF', '#1857C0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upcomingGradient}
            >
              <View style={styles.upcomingHeader}>
                <View style={styles.upcomingBadge}>
                  <Ionicons
                    name={nextAppointment.type === 'video' ? 'videocam' : 'location'}
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.upcomingBadgeText}>
                    {nextAppointment.type === 'video' ? 'Video Call' : 'In-Clinic'}
                  </Text>
                </View>
                <Text style={styles.upcomingDate}>
                  {new Date(nextAppointment.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.upcomingTitle}>Upcoming Appointment</Text>
              <View style={styles.upcomingTimeRow}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.upcomingTime}>
                  {nextAppointment.timeSlot.start} – {nextAppointment.timeSlot.end}
                </Text>
              </View>
              <View style={styles.upcomingFooter}>
                <Text style={styles.upcomingViewText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

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
            featuredDoctors.map((doctor: Doctor, index: number) => (
              <View key={doctor.doctorId}>
                {renderDoctorCard({ item: doctor, index })}
              </View>
            ))
          )}
        </View>

        {/* ── Health Tips Section ─────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Health Tips</Text>
              <Text style={styles.sectionSubtitle}>Stay informed, stay healthy</Text>
            </View>
          </View>
          <View style={styles.healthTipsSection}>
            <TouchableOpacity activeOpacity={0.85} style={styles.healthTipCard}>
              <LinearGradient
                colors={sh.grad(['#ECFDF5', '#D1FAE5'])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.healthTipGradient}
              >
                <View style={styles.healthTipIconWrap}>
                  <MaterialCommunityIcons name="heart-pulse" size={20} color="#059669" />
                </View>
                <Text style={styles.healthTipTitle}>Preventive Care</Text>
                <Text style={styles.healthTipText}>
                  Regular checkups detect issues early. Book an annual health screening today.
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.healthTipCard}>
              <LinearGradient
                colors={sh.grad(['#EFF6FF', '#DBEAFE'])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.healthTipGradient}
              >
                <View style={styles.healthTipIconWrap}>
                  <MaterialCommunityIcons name="water" size={20} color="#2563EB" />
                </View>
                <Text style={styles.healthTipTitle}>Stay Hydrated</Text>
                <Text style={styles.healthTipText}>
                  Drink 8 glasses of water daily for optimal body function and energy.
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Safe Area */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

// ── Styles ──────────────────────────────────

const makeStyles = (THEME: ReturnType<typeof makeTHEME>, sh: DarkShift) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: sh.n('#F1F5F9', 'lineSoft'),
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
    paddingTop: STATUS_BAR_HEIGHT + 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: sh.n('#FFFFFF', 'inkInverse'),
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
  },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -16,
    marginBottom: 24,
  },
  searchWrapperFocused: {
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sh.n('#E2E8F0', 'line'),
    ...Platform.select({
      ios: { shadowColor: sh.n('#64748B', 'inkMuted'), shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  searchContainerFocused: {
    borderColor: THEME.primary,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
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
    // No horizontal padding here: the scroller runs edge to edge and insets
    // its own content, so cards slide fully off-screen rather than clipping
    // against a padded parent.
    marginBottom: 28,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  quickActionCard: {
    // Fixed rather than flex:1 — identical cards regardless of label length.
    width: 104,
    borderRadius: 16,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: sh.n('#EEF2FF', 'lineSoft'),
    ...Platform.select({
      ios: { shadowColor: sh.n('#64748B', 'inkMuted'), shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  quickActionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: sh.n('#1E293B', 'ink'),
    textAlign: 'center',
    lineHeight: 16,
  },

  // Trust Stats Bar
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sh.n('#EEF2FF', 'lineSoft'),
    ...Platform.select({
      ios: { shadowColor: sh.n('#64748B', 'inkMuted'), shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  trustIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustValue: {
    fontSize: 14,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.3,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: sh.n('#94A3B8', 'inkFaint'),
    marginTop: 1,
  },
  trustDivider: {
    width: 1,
    height: 28,
    backgroundColor: sh.n('#E2E8F0', 'line'),
  },

  // Upcoming Appointment Card
  upcomingCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: sh.hue('#2A7FFF'),
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  upcomingGradient: {
    padding: 18,
    borderRadius: 16,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
    marginBottom: 6,
  },
  upcomingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  upcomingTime: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  upcomingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  upcomingViewText: {
    fontSize: 13,
    fontWeight: '600',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
    marginTop: 3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: sh.ground('#EAF3FF', '#2A7FFF'),
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
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
    width: 62,
    height: 62,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: sh.hue('#2A7FFF'),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  specialtyName: {
    fontSize: 12,
    fontWeight: '700',
    color: sh.n('#1E293B', 'ink'),
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  specialtyCountBadge: {
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
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
        shadowColor: sh.hue('#2A7FFF'),
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
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
    color: sh.hue('#A5F3FC'),
  },
  bannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bannerCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: sh.hue('#1857C0'),
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sh.n('#EEF2FF', 'lineSoft'),
    ...Platform.select({
      ios: {
        shadowColor: sh.n('#64748B', 'inkMuted'),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: sh.n('#FFFFFF', 'surface'),
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
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
    backgroundColor: sh.ground('#FFFBEB', '#F59E0B'),
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: sh.hue('#D97706'),
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: sh.n('#CBD5E1', 'disabled'),
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
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Health Tips
  healthTipsSection: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  healthTipCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: sh.n('#64748B', 'inkMuted'), shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  healthTipGradient: {
    padding: 16,
    borderRadius: 16,
    minHeight: 140,
  },
  healthTipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthTipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    marginBottom: 6,
  },
  healthTipText: {
    fontSize: 11,
    fontWeight: '500',
    color: sh.n('#475569', 'inkMuted'),
    lineHeight: 16,
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
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
});

export default HealthcareHomeScreen;