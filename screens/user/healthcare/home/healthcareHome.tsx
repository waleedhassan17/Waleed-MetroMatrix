// ═══════════════════════════════════════════════════════
// Healthcare home — the patient's landing page in the Health module
// ═══════════════════════════════════════════════════════
// The header is the FYP's own and stays exactly as it was: the clinical-blue
// gradient, the way back to the module chooser, "Find Your Doctor", the
// search bar riding its lower edge, and the white title that fades in on
// scroll. Under it the page is photo-led, top to bottom: the wallet; "how
// can we help you today?" (the two ways to be seen, and who is free today);
// the next visit and its one action; Health's own services as photo tiles;
// staff banners; the specialty grid; the city's top doctors; doctors free
// today; the concerns patients name; why MetroMatrix Health; and, quietly
// last, the emergency line. Every photo is licensed (assets/images/
// healthcare/CREDITS.md). The page comes from one call, GET /home.

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { barStyleOn, useTheme } from '../../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, BackButton, Skeleton } from '../../../../components/ui';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchHomeData, clearError, setCityPicker, selectHealthcareHome } from './healthcareHomeSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { makeColors, Spacing, type ColorType } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  HC_HOME,
  HC_TYPE,
  HCRadius,
  HCShadow,
  HCSpace,
  makeHC,
  makeSpecialtyTints,
  type HCPalette,
} from '../../../../constants/HealthcareTheme';
import type { Doctor, DoctorListPreset, HealthcareBanner, HealthConcern, Specialty } from '../../../../models/healthcare/types';
import MiniWalletCard from '../../../../components/MiniWalletCard/MiniWalletCard';
import {
  CareCard,
  CityChip,
  ConcernTile,
  DoctorRailCard,
  DoctorSpotlightCard,
  EmergencyStrip,
  HEALTH_PHOTOS,
  HomeSection,
  PHOTO_FOCUS,
  NextVisitCard,
  PhotoBannerCarousel,
  PhotoTile,
  QuickRow,
  SpecialtyGridTile,
  TrustList,
  type HealthPhoto,
} from '../../../../components/Healthcare/home';
import {
  bannerCta,
  bannerRoute,
  homeSpecialties,
  nextVisitAction,
  specialtyIcon,
  visitSoonLabel,
} from '../../../../utils/healthcare/homeDisplay';

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
// Health's own services, as photo tiles (the emergency tile's name is red).
const TILES: { key: string; label: string; photo: HealthPhoto; route: string; tone?: 'danger' }[] = [
  { key: 'specialties', label: 'Specialties', photo: 'specialties', route: HealthcareRouteNames.SpecialtyList },
  { key: 'records', label: 'Health records', photo: 'records', route: HealthcareRouteNames.HealthRecords },
  { key: 'prescriptions', label: 'Prescriptions', photo: 'prescriptions', route: HealthcareRouteNames.MyPrescriptions },
  { key: 'symptoms', label: 'Symptom checker', photo: 'symptoms', route: HealthcareRouteNames.SymptomChecker },
  { key: 'vitals', label: 'Vitals', photo: 'vitals', route: HealthcareRouteNames.Vitals },
  { key: 'emergency', label: 'Emergency', photo: 'emergency', route: HealthcareRouteNames.Emergency, tone: 'danger' },
];

const GRID_COLUMNS = 4;
/** The next visit's countdown ("Starts in 12 min") refreshes this often. */
const CLOCK_TICK = 30 * 1000;

// ── Main Component ──────────────────────────

const HealthcareHomeScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh, Colors), [THEME, sh, Colors]);
  const HC = useMemo(() => makeHC(mode), [mode]);
  const body = useMemo(() => makeBodyStyles(HC), [HC]);
  const tints = useMemo(() => makeSpecialtyTints(mode), [mode]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { home, loading, error, cityPicker } = useAppSelector(selectHealthcareHome);

  const [refreshing, setRefreshing] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initial load animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Every visit to the tab: reuse a copy younger than a minute, else refetch —
  // so a visit booked a moment ago is the next visit when the patient returns.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchHomeData());
    }, [dispatch])
  );

  // The countdown on the next visit ("Starts in 12 min", "Join") moves on its own.
  const upcoming = home?.upcoming ?? null;
  useEffect(() => {
    if (!upcoming) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), CLOCK_TICK);
    return () => clearInterval(t);
  }, [upcoming]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchHomeData({ force: true }));
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

  const city = home?.city ?? 'Lahore';

  // Every home link into the doctor list carries its own filters (or none), so
  // nothing left from an earlier visit narrows it.
  const openDoctors = (specialtyId: string, specialtyName: string, filter: DoctorListPreset = {}) =>
    navigation.navigate(HealthcareRouteNames.DoctorList, { specialtyId, specialtyName, filter });

  const openVideo = () => openDoctors('', 'Video consultation', { consultationType: 'video' });
  const openClinic = () => openDoctors('', `Clinic visits in ${city}`, { consultationType: 'in-clinic', city });
  const openToday = () => openDoctors('', `Available today in ${city}`, { availability: 'today', city });
  const openSpecialty = (s: Specialty) => openDoctors(s.specialtyId, s.name);
  const openConcern = (c: HealthConcern) => openDoctors(c.specialtyId, c.specialtyName || c.name);
  const openDoctor = (d: Doctor) => navigation.navigate(HealthcareRouteNames.DoctorDetail, { doctorId: d.doctorId });
  const openAppointments = () => navigation.navigate(HealthcareRouteNames.MyAppointments);

  const openBanner = (b: HealthcareBanner) => {
    const route = bannerRoute(b);
    if (route) navigation.navigate(route.name, route.params);
  };

  const action = upcoming ? nextVisitAction(upcoming, now, HC_HOME.joinEarlyMinutes) : null;
  const onVisitAction = () => {
    if (!upcoming || !action) return;
    if (action.kind === 'join') {
      // The same unified call screen the appointment's own Join opens.
      navigation.navigate('HealthcareConsultCall', {
        roomId: upcoming.appointmentId,
        appointmentId: upcoming.appointmentId,
        roomType: 'healthcare',
        media: 'video',
        counterpartName: upcoming.doctorName,
      });
    } else {
      navigation.navigate(HealthcareRouteNames.AppointmentPayment, { appointmentId: upcoming.appointmentId });
    }
  };

  const chooseCity = (next: string) => {
    if (next !== city) dispatch(fetchHomeData({ city: next, force: true }));
  };

  const grid = homeSpecialties(home?.specialties ?? []);
  const gridRows = [grid.slice(0, GRID_COLUMNS), grid.slice(GRID_COLUMNS, GRID_COLUMNS * 2)].filter((r) => r.length);
  const tintAt = (i: number) => tints[i % tints.length];
  const cities = home?.cities ?? [];
  const canChangeCity = cities.length > 1 || (cities.length === 1 && cities[0].toLowerCase() !== city.toLowerCase());

  // ── Error State ─────────────────────────────

  if (error && !loading && !home) {
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
              dispatch(fetchHomeData({ force: true }));
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
      <StatusBar barStyle={barStyleOn(THEME.primary)} backgroundColor={THEME.primary} translucent />

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

        <View style={body.page}>
          {/* ── How can we help you today? ─────── */}
          <View style={body.block}>
            <HomeSection title="How can we help you today?" />
            <View style={body.bento}>
              <View style={body.bentoColumn}>
                <CareCard
                  tall
                  tint="video"
                  title="Video consultation"
                  body="See a doctor from home"
                  image={HEALTH_PHOTOS.video}
                  focus={PHOTO_FOCUS.video}
                  onPress={openVideo}
                />
              </View>
              <View style={body.bentoColumn}>
                <CareCard
                  tint="clinic"
                  title="Clinic visit"
                  body="Book a confirmed time"
                  image={HEALTH_PHOTOS.clinic}
                  focus={PHOTO_FOCUS.clinic}
                  onPress={openClinic}
                />
                <CareCard
                  tint="today"
                  title="Available today"
                  body="Doctors free now"
                  image={HEALTH_PHOTOS.available}
                  focus={PHOTO_FOCUS.available}
                  onPress={openToday}
                />
              </View>
            </View>
          </View>

          {/* ── Your next visit ────────────────── */}
          {!home ? (
            <Skeleton height={HC_HOME.careShort} radius={HCRadius.lg} />
          ) : upcoming ? (
            <View style={body.block}>
              <HomeSection title="Your next visit" onSeeAll={openAppointments} seeAllLabel="All appointments" />
              <NextVisitCard
                appointment={upcoming}
                soon={visitSoonLabel(upcoming, now)}
                action={action}
                onPress={() => navigation.navigate(HealthcareRouteNames.AppointmentDetail, { appointmentId: upcoming.appointmentId })}
                onAction={onVisitAction}
              />
            </View>
          ) : (
            <QuickRow icon="calendar-outline" title="My appointments" body="Upcoming and past visits" onPress={openAppointments} />
          )}

          {/* ── Health's own services ──────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={body.rail} contentContainerStyle={body.railContent}>
            {TILES.map((t) => (
              <PhotoTile
                key={t.key}
                label={t.label}
                image={HEALTH_PHOTOS[t.photo]}
                focus={PHOTO_FOCUS[t.photo]}
                tone={t.tone}
                onPress={() => navigation.navigate(t.route)}
              />
            ))}
          </ScrollView>

          {/* ── Staff banners ──────────────────── */}
          {home?.banners.length ? (
            <View style={body.bleed}>
              <PhotoBannerCarousel banners={home.banners} onOpen={openBanner} cta={bannerCta} />
            </View>
          ) : null}

          {/* ── Find by specialty ──────────────── */}
          <View style={body.block}>
            <HomeSection title="Find by specialty" onSeeAll={() => navigation.navigate(HealthcareRouteNames.SpecialtyList)} />
            {!home ? (
              <Skeleton height={HC_HOME.careTall - HCSpace.xxxl} radius={HCRadius.lg} />
            ) : gridRows.length ? (
              <View style={body.grid}>
                {gridRows.map((row, r) => (
                  <View key={r} style={body.gridRow}>
                    {row.map((sp, i) => (
                      <SpecialtyGridTile key={sp.specialtyId} specialty={sp} tint={tintAt(r * GRID_COLUMNS + i)} onPress={() => openSpecialty(sp)} />
                    ))}
                    {Array.from({ length: GRID_COLUMNS - row.length }, (_, k) => (
                      <View key={`gap-${k}`} style={body.gridGap} />
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* ── Top doctors in the city ────────── */}
          <View style={body.block}>
            <HomeSection
              title={`Top doctors in ${city}`}
              subtitle="Rated highest by their patients"
              trailing={canChangeCity ? <CityChip city={city} onPress={() => dispatch(setCityPicker(true))} /> : undefined}
            />
            {!home ? (
              <View style={body.railSkeleton}>
                <Skeleton width={HC_HOME.spotlightWidth} height={HC_HOME.careShort + HCSpace.xxxl} radius={HCRadius.lg} />
                <Skeleton width={HC_HOME.spotlightWidth} height={HC_HOME.careShort + HCSpace.xxxl} radius={HCRadius.lg} />
              </View>
            ) : home.featuredDoctors.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={body.rail} contentContainerStyle={body.railContent}>
                {home.featuredDoctors.map((d) => (
                  <DoctorSpotlightCard key={d.doctorId} doctor={d} onPress={() => openDoctor(d)} onBook={() => openDoctor(d)} />
                ))}
              </ScrollView>
            ) : (
              <Text style={body.muted}>{`No doctors are listed in ${city} yet.`}</Text>
            )}
          </View>

          {/* ── Available today ────────────────── */}
          <View style={body.block}>
            <HomeSection title={`Available today in ${city}`} onSeeAll={openToday} />
            {!home ? (
              <View style={body.railSkeleton}>
                <Skeleton width={HC_HOME.railCardWidth} height={HC_HOME.careShort + HCSpace.md} radius={HCRadius.lg} />
                <Skeleton width={HC_HOME.railCardWidth} height={HC_HOME.careShort + HCSpace.md} radius={HCRadius.lg} />
              </View>
            ) : home.availableToday.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={body.rail} contentContainerStyle={body.railContent}>
                {home.availableToday.map((d) => (
                  <DoctorRailCard key={d.doctorId} doctor={d} onPress={() => openDoctor(d)} />
                ))}
              </ScrollView>
            ) : (
              <Text style={body.muted}>No doctor has time left today. Tomorrow’s times are open on each profile.</Text>
            )}
          </View>

          {/* ── Common concerns ────────────────── */}
          {home?.commonConcerns.length ? (
            <View style={body.block}>
              <HomeSection title="Common concerns" subtitle="Not sure of the specialty? Start with what you feel." />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={body.rail} contentContainerStyle={body.concerns}>
                {home.commonConcerns.map((c, i) => (
                  <ConcernTile
                    key={`${c.specialtyId}-${c.name}`}
                    name={c.name}
                    icon={specialtyIcon(c.icon, c.specialtyName)}
                    tint={tintAt(i + 3)}
                    onPress={() => openConcern(c)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <TrustList />

          <EmergencyStrip numbers={home?.emergencyNumbers ?? []} onOpen={() => navigation.navigate(HealthcareRouteNames.Emergency)} />
        </View>

        {/* Bottom Safe Area */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <ActionSheet
        visible={cityPicker}
        title="Choose your city"
        options={cities.map((c) => ({
          label: c,
          icon: c.toLowerCase() === city.toLowerCase() ? 'checkmark' : 'location-outline',
          onPress: () => chooseCity(c),
        }))}
        onClose={() => dispatch(setCityPicker(false))}
      />
    </View>
  );
};

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

// ── Styles ──────────────────────────────────

const makeStyles = (
  THEME: ReturnType<typeof makeTHEME>,
  sh: DarkShift,
  Colors: ColorType,
) => StyleSheet.create({
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

// ── The page under the header (the FYP's 20 side gutter, 32 between sections) ──

const makeBodyStyles = (HC: HCPalette) =>
  StyleSheet.create({
    page: { paddingHorizontal: HCSpace.xl, paddingTop: HCSpace.lg, gap: HCSpace.xxxl },
    block: { gap: HCSpace.md },
    bento: { flexDirection: 'row', gap: HCSpace.md },
    bentoColumn: { flex: 1, gap: HCSpace.md },
    rail: { marginHorizontal: -HCSpace.xl },
    railContent: { paddingHorizontal: HCSpace.xl, gap: HCSpace.md, paddingBottom: HCSpace.xs },
    concerns: { paddingHorizontal: HCSpace.xl, gap: HCSpace.sm },
    bleed: { marginHorizontal: -HCSpace.xl },
    grid: {
      padding: HCSpace.md,
      gap: HCSpace.xs,
      borderRadius: HCRadius.lg,
      backgroundColor: HC.card,
      borderWidth: 1,
      borderColor: HC.borderLight,
      ...HCShadow.xs,
    },
    gridRow: { flexDirection: 'row', gap: HCSpace.xs },
    gridGap: { flex: 1 },
    railSkeleton: { flexDirection: 'row', gap: HCSpace.md, overflow: 'hidden' },
    muted: { ...HC_TYPE.small, color: HC.textLight },
  });

export default HealthcareHomeScreen;
