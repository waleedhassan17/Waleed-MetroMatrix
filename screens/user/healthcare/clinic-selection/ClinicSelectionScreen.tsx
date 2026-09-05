import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Linking,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { useTheme } from '../../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchClinics,
  setSelectedClinic,
  clearClinicSelection,
  selectClinicsWithAvailability,
} from './clinicSelectionSlice';
import type { Clinic, ClinicTiming, HealthcareStackParamList } from '../../../../models/healthcare/types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Theme Colors (Consistent) ───────────────

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
  error: hue('#EF4444'),
  gradient: {
    primary: grad(['#2A7FFF', '#1857C0']),
    header: grad(['#1857C0', '#1E6AE1']),
    accent: grad(['#5A9FFF', '#2A7FFF']),
    success: grad(['#10B981', '#059669']),
  },
  };
};

// ── Route / Nav Types ───────────────────────

type ClinicSelectionRoute = RouteProp<HealthcareStackParamList, 'ClinicSelection'>;
type Nav = NativeStackNavigationProp<HealthcareStackParamList>;

// ── Helpers ─────────────────────────────────

const formatTime12 = (time24: string): string => {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
};

const getTodayName = (): string => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
};

const openInMaps = (clinic: Clinic) => {
  const { lat, lng } = clinic.coordinates;
  const label = encodeURIComponent(clinic.name);
  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  if (url) Linking.openURL(url);
};

const callClinic = (phone: string) => {
  Linking.openURL(`tel:${phone}`);
};

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

const ClinicCardSkeleton: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);

  return (
  <View style={styles.card}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <SkeletonBox width={24} height={24} borderRadius={12} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <SkeletonBox width="70%" height={18} />
        <SkeletonBox width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
    <SkeletonBox width="100%" height={14} style={{ marginBottom: 8 }} />
    <SkeletonBox width="60%" height={14} style={{ marginBottom: 16 }} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <SkeletonBox width={80} height={28} borderRadius={8} />
      <SkeletonBox width={80} height={28} borderRadius={8} />
    </View>
  </View>
  );
};

// ── Timing Badge Component ──────────────────

const TimingBadge: React.FC<{ timing: ClinicTiming | null; isOpenNow: boolean }> = ({
  timing,
  isOpenNow,
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  if (!timing || !timing.isOpen) {
    return (
      <View style={[styles.timingBadge, styles.timingBadgeClosed]}>
        <View style={[styles.timingDot, { backgroundColor: THEME.error }]} />
        <Text style={[styles.timingBadgeText, { color: THEME.error }]}>Closed Today</Text>
      </View>
    );
  }

  return (
    <View style={[styles.timingBadge, isOpenNow && styles.timingBadgeOpen]}>
      <View style={[styles.timingDot, { backgroundColor: isOpenNow ? THEME.success : THEME.warning }]} />
      <Text style={[styles.timingBadgeText, { color: isOpenNow ? THEME.success : Colors.text.secondary }]}>
        {isOpenNow ? 'Open Now' : `Opens ${formatTime12(timing.openTime)}`}
      </Text>
    </View>
  );
};

// ── Clinic Card ─────────────────────────────

interface ClinicCardProps {
  clinic: Clinic;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

const ClinicCard: React.FC<ClinicCardProps> = React.memo(
  ({ clinic, isSelected, onSelect, index }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const todayName = getTodayName();
    const todayTiming = clinic.timings?.find(
      (t) => t.day.toLowerCase() === todayName.toLowerCase()
    );

    // Check if currently open
    const isOpenNow = (): boolean => {
      if (!todayTiming || !todayTiming.isOpen) return false;
      const now = new Date();
      const [openH, openM] = todayTiming.openTime.split(':').map(Number);
      const [closeH, closeM] = todayTiming.closeTime.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    };

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, []);

    const openDays = clinic.timings?.filter((t) => t.isOpen) || [];

    return (
      <Animated.View
        style={{
          opacity: scaleAnim,
          transform: [
            {
              translateY: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={[styles.card, isSelected && styles.cardSelected]}
          onPress={onSelect}
          activeOpacity={0.7}
        >
          {/* Header with Radio */}
          <View style={styles.cardHeader}>
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && (
                <View style={styles.radioInner}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.cardHeaderInfo}>
              {/* The "Selected" chip that sat here was the third indicator of
                  the same state — alongside the radio tick and the Selected
                  button below — and it squeezed the name into an ellipsis
                  ("Faisal Rehman Clinic DH…"). The radio and the button say
                  it well enough; give the name the room instead. */}
              <View style={styles.clinicNameRow}>
                <Text style={styles.clinicName} numberOfLines={2}>
                  {clinic.name}
                </Text>
              </View>
              <Text style={styles.clinicCity}>{clinic.city}</Text>
            </View>
          </View>

          {/* Timing Badge */}
          <View style={styles.timingContainer}>
            <TimingBadge timing={todayTiming || null} isOpenNow={isOpenNow()} />
            {todayTiming?.isOpen && (
              <Text style={styles.timingHours}>
                {formatTime12(todayTiming.openTime)} - {formatTime12(todayTiming.closeTime)}
              </Text>
            )}
          </View>

          {/* Address Row */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBg, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
              <Ionicons name="location" size={14} color={THEME.primary} />
            </View>
            <Text style={styles.infoText} numberOfLines={2}>
              {clinic.address}
            </Text>
          </View>

          {/* Phone Row */}
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => callClinic(clinic.phone)}
          >
            <View style={[styles.infoIconBg, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="call" size={14} color={THEME.success} />
            </View>
            <Text style={[styles.infoText, styles.phoneText]}>{clinic.phone}</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME.success} />
          </TouchableOpacity>

          {/* Weekly Schedule */}
          {openDays.length > 0 && (
            <View style={styles.scheduleContainer}>
              <View style={styles.scheduleHeader}>
                <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} />
                <Text style={styles.scheduleLabel}>Weekly Schedule</Text>
              </View>
              <View style={styles.scheduleGrid}>
                {clinic.timings?.slice(0, 7).map((t) => (
                  <View
                    key={t.day}
                    style={[
                      styles.dayChip,
                      t.isOpen && styles.dayChipOpen,
                      t.day.toLowerCase() === todayName.toLowerCase() && styles.dayChipToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        t.isOpen && styles.dayChipTextOpen,
                        t.day.toLowerCase() === todayName.toLowerCase() && styles.dayChipTextToday,
                      ]}
                    >
                      {t.day.substring(0, 2)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Amenities */}
          {clinic.amenities && clinic.amenities.length > 0 && (
            <View style={styles.amenitiesContainer}>
              {clinic.amenities.slice(0, 4).map((amenity, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Ionicons name="checkmark-circle" size={12} color={THEME.success} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
              {clinic.amenities.length > 4 && (
                <View style={styles.amenityMore}>
                  <Text style={styles.amenityMoreText}>
                    +{clinic.amenities.length - 4} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => callClinic(clinic.phone)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="call" size={16} color={THEME.success} />
              </View>
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openInMaps(clinic)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
                <Ionicons name="navigate" size={16} color={THEME.primary} />
              </View>
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.selectButton, isSelected && styles.selectButtonActive]}
              onPress={onSelect}
            >
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                size={18}
                color={isSelected ? '#FFFFFF' : THEME.primary}
              />
              <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextActive]}>
                {isSelected ? 'Selected' : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

// ── Main Screen ─────────────────────────────

const ClinicSelectionScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ClinicSelectionRoute>();
  const { doctorId } = route.params;

  const { clinics, selectedClinic, loading, error } = useAppSelector(
    (s) => s.clinicSelection
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bottomBarAnim = useRef(new Animated.Value(100)).current;
  const insets = useSafeAreaInsets();

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
  }, []);

  useEffect(() => {
    dispatch(fetchClinics(doctorId));
    return () => {
      dispatch(clearClinicSelection());
    };
  }, [dispatch, doctorId]);

  useEffect(() => {
    if (selectedClinic) {
      Animated.spring(bottomBarAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(bottomBarAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedClinic]);

  const handleSelect = useCallback(
    (clinic: Clinic) => {
      dispatch(setSelectedClinic(clinic));
    },
    [dispatch]
  );

  const handleContinue = useCallback(() => {
    if (!selectedClinic) return;
    navigation.navigate('SlotSelection' as any, {
      doctorId,
      clinicId: selectedClinic.clinicId,
    });
  }, [navigation, doctorId, selectedClinic]);

  const renderClinic = useCallback(
    ({ item, index }: { item: Clinic; index: number }) => (
      <ClinicCard
        clinic={item}
        isSelected={selectedClinic?.clinicId === item.clinicId}
        onSelect={() => handleSelect(item)}
        index={index}
      />
    ),
    [selectedClinic, handleSelect]
  );

  // ── Render ──────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* Header */}
      <LinearGradient
        colors={THEME.gradient.header as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        <View style={styles.headerContent}>
          <BackButton tone="onAccent" onPress={() => navigation.goBack()} />

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Select Clinic</Text>
            <Text style={styles.headerSubtitle}>
              {clinics.length} {clinics.length === 1 ? 'location' : 'locations'} available
            </Text>
          </View>

          <View style={{ width: 42 }} />
        </View>
      </LinearGradient>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            keyExtractor={(item) => String(item)}
            renderItem={() => <ClinicCardSkeleton />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color={THEME.error} />
            </View>
            <Text style={styles.errorTitle}>Something Went Wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => dispatch(fetchClinics(doctorId))}
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
        ) : clinics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons
                name="hospital-building"
                size={48}
                color="#94A3B8"
              />
            </View>
            <Text style={styles.emptyTitle}>No Clinics Found</Text>
            <Text style={styles.emptySubtitle}>
              This doctor doesn't have any registered clinic locations yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={clinics}
            keyExtractor={(item) => item.clinicId}
            renderItem={renderClinic}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 120 }} />}
          />
        )}
      </Animated.View>

      {/* Bottom Bar */}
      <Animated.View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          { transform: [{ translateY: bottomBarAnim }] },
        ]}
      >
        <View style={styles.bottomContent}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected Clinic</Text>
            <Text style={styles.selectedValue} numberOfLines={1}>
              {selectedClinic?.name || 'None selected'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
            disabled={!selectedClinic}
          >
            <LinearGradient
              colors={THEME.gradient.success as any}
              style={styles.continueButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default ClinicSelectionScreen;

// ── Styles ──────────────────────────────────

const makeStyles = (THEME: ReturnType<typeof makeTHEME>, sh: DarkShift) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
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
    color: sh.n('#FFFFFF', 'inkInverse'),
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Content
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: sh.n('#F1F5F9', 'lineSoft'),
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
  cardSelected: {
    borderColor: THEME.primary,
    backgroundColor: sh.n('#FAFCFF', 'surfaceSunken'),
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: sh.n('#CBD5E1', 'disabled'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary,
  },
  radioInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  clinicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clinicName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  selectedBadge: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.primary,
  },
  clinicCity: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Timing
  timingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingLeft: 36,
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timingBadgeOpen: {
    backgroundColor: sh.ground('#DCFCE7', '#10B981'),
  },
  timingBadgeClosed: {
    backgroundColor: sh.ground('#FEE2E2', '#EF4444'),
  },
  timingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timingHours: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 36,
    marginBottom: 10,
  },
  infoIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  phoneText: {
    color: THEME.success,
    fontWeight: '600',
  },

  // Schedule
  scheduleContainer: {
    paddingLeft: 36,
    marginTop: 4,
    marginBottom: 14,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipOpen: {
    backgroundColor: sh.ground('#DCFCE7', '#10B981'),
  },
  dayChipToday: {
    backgroundColor: THEME.primary,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  dayChipTextOpen: {
    color: THEME.success,
  },
  dayChipTextToday: {
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Amenities
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 36,
    marginBottom: 14,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: sh.n('#F0FDF4', 'surfaceSunken'),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.success,
  },
  amenityMore: {
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
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
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.primaryLight,
    paddingVertical: 14,
  },
  selectButtonActive: {
    backgroundColor: THEME.primary,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  selectButtonTextActive: {
    color: sh.n('#FFFFFF', 'inkInverse'),
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
    backgroundColor: sh.ground('#FEE2E2', '#EF4444'),
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
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: sh.n('#F1F5F9', 'lineSoft'),
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

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // paddingBottom comes from the safe-area inset at the call site: the fixed
    // value put Continue under the Android nav buttons.
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: sh.n('#F1F5F9', 'lineSoft'),
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
  selectedInfo: {
    flex: 1,
    marginRight: 12,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  selectedValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 2,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
});