import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { useTheme } from '../../../../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchPrescription,
  downloadPDF,
  sharePrescription,
  resetPrescription,
  Medication,
} from './prescriptionViewSlice';

// ── Theme ─────────────────────────────────────

// A function of the mode. Light returns exactly the literals this block
// always held; dark is derived by role — see constants/darkShift.ts.
const makeTHEME = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);
  return {
  primary: hue('#2A7FFF'),
  primaryLight: ground('#EAF3FF', '#2A7FFF'),
  accent: hue('#5A9FFF'),
  success: hue('#10B981'),
  warning: hue('#F59E0B'),
  gradient: {
    primary: grad(['#2A7FFF', '#1857C0']) as [string, string],
    success: grad(['#10B981', '#059669']) as [string, string],
    warm: grad(['#F59E0B', '#EF4444']) as [string, string],
  },
  };
};

type PrescriptionViewParams = {
  PrescriptionView: { prescriptionId: string };
};

const PrescriptionViewScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PrescriptionViewParams, 'PrescriptionView'>>();
  const dispatch = useAppDispatch();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cardAnims = useRef([0,1,2,3,4,5].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.stagger(
        70,
        cardAnims.map((a) =>
          Animated.spring(a, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        )
      ),
    ]).start();
  }, []);

  const { prescription, loading, error, downloading, sharing } = useAppSelector(
    (state) => state.prescriptionView,
  );

  const prescriptionId = route.params?.prescriptionId ?? '';

  useEffect(() => {
    dispatch(fetchPrescription(prescriptionId));
    return () => { dispatch(resetPrescription()); };
  }, [dispatch, prescriptionId]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // ── Loading ─────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <View style={styles.loadingIconWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
        <Text style={styles.loadingText}>Loading prescription…</Text>
        <Text style={styles.loadingSubtext}>Please wait a moment</Text>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────

  if (error || !prescription) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <View style={styles.errorIconWrap}>
          <LinearGradient colors={sh.grad(['#FEE2E2', '#FECACA'])} style={styles.errorIconGradient}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </LinearGradient>
        </View>
        <Text style={styles.errorTitle}>Could not load prescription</Text>
        <Text style={styles.errorSubtext}>{error ?? 'Prescription not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => dispatch(fetchPrescription(prescriptionId))}
          activeOpacity={0.85}
        >
          <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryButtonGradient}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Prescription</Text>
          <Text style={styles.headerSubtitle}>#{prescription.prescriptionId.slice(-8)}</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialCommunityIcons name="file-certificate-outline" size={18} color="#FFFFFF" />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >

        {/* ── Doctor Info Card ── */}
        <Animated.View style={[styles.animCard, {
          opacity: cardAnims[0],
          transform: [{ translateY: cardAnims[0].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.doctorRow}>
              {prescription.doctor.profileImage ? (
                <Image source={{ uri: prescription.doctor.profileImage }} style={styles.doctorAvatar} />
              ) : (
                <LinearGradient colors={[THEME.primaryLight, '#F0F7FF']} style={styles.doctorAvatarPlaceholder}>
                  <MaterialCommunityIcons name="doctor" size={28} color={THEME.primary} />
                </LinearGradient>
              )}
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{prescription.doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{prescription.doctor.specialty}</Text>
                <Text style={styles.doctorQuals} numberOfLines={1}>
                  {prescription.doctor.qualifications.join('  ·  ')}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />
              </View>
            </View>

            <View style={styles.issuedRow}>
              <View style={styles.issuedLeft}>
                <Ionicons name="calendar-outline" size={14} color={THEME.primary} />
                <Text style={styles.issuedLabel}>Issued</Text>
              </View>
              <Text style={styles.issuedDate}>{formatDate(prescription.issuedAt)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Patient Info Strip ── */}
        <Animated.View style={[styles.animCard, {
          opacity: cardAnims[1],
          transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <LinearGradient colors={sh.grad(['#F0F7FF', '#EAF3FF'])} style={styles.patientStrip}>
            <View style={styles.patientItem}>
              <Text style={styles.patientItemLabel}>Patient</Text>
              <Text style={styles.patientItemValue}>{prescription.patient.name}</Text>
            </View>
            <View style={styles.patientDivider} />
            <View style={styles.patientItem}>
              <Text style={styles.patientItemLabel}>Age</Text>
              <Text style={styles.patientItemValue}>{prescription.patient.age} yrs</Text>
            </View>
            <View style={styles.patientDivider} />
            <View style={styles.patientItem}>
              <Text style={styles.patientItemLabel}>Gender</Text>
              <Text style={styles.patientItemValue}>{prescription.patient.gender}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Diagnosis ── */}
        <Animated.View style={[styles.animCard, {
          opacity: cardAnims[2],
          transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: sh.ground('#F0F7FF', '#2A7FFF') }]}>
                <MaterialCommunityIcons name="stethoscope" size={16} color={THEME.primary} />
              </View>
              <Text style={styles.sectionTitle}>Diagnosis</Text>
            </View>
            <View style={styles.diagnosisBlock}>
              <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Medications ── */}
        <Animated.View style={[styles.animCard, {
          opacity: cardAnims[3],
          transform: [{ translateY: cardAnims[3].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: sh.ground('#EAF3FF', '#2A7FFF') }]}>
                <MaterialCommunityIcons name="pill" size={16} color={THEME.accent} />
              </View>
              <Text style={styles.sectionTitle}>Medications</Text>
              <View style={styles.medCountBadge}>
                <Text style={styles.medCountText}>{prescription.medications.length}</Text>
              </View>
            </View>

            {prescription.medications.map((med: Medication, index: number) => (
              <View
                key={index}
                style={[
                  styles.medicationItem,
                  index < prescription.medications.length - 1 && styles.medicationBorder,
                ]}
              >
                <LinearGradient
                  colors={THEME.gradient.primary}
                  style={styles.medNumberBadge}
                >
                  <Text style={styles.medNumberText}>{index + 1}</Text>
                </LinearGradient>

                <View style={styles.medContent}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <View style={styles.medTagRow}>
                    <View style={[styles.medTag, { backgroundColor: sh.ground('#F0F7FF', '#2A7FFF') }]}>
                      <MaterialCommunityIcons name="flask-outline" size={11} color={THEME.primary} />
                      <Text style={[styles.medTagText, { color: THEME.primary }]}>{med.dosage}</Text>
                    </View>
                    <View style={[styles.medTag, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="time-outline" size={11} color={THEME.success} />
                      <Text style={[styles.medTagText, { color: THEME.success }]}>{med.frequency}</Text>
                    </View>
                    <View style={[styles.medTag, { backgroundColor: sh.ground('#FFFBEB', '#F59E0B') }]}>
                      <MaterialCommunityIcons name="timer-outline" size={11} color={THEME.warning} />
                      <Text style={[styles.medTagText, { color: THEME.warning }]}>{med.duration}</Text>
                    </View>
                  </View>
                  {med.instructions ? (
                    <View style={styles.medInstructionsRow}>
                      <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
                      <Text style={styles.medInstructions}>{med.instructions}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Tests Recommended ── */}
        {prescription.testsRecommended.length > 0 && (
          <Animated.View style={[styles.animCard, {
            opacity: cardAnims[4],
            transform: [{ translateY: cardAnims[4].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
          }]}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="document-text-outline" size={16} color={THEME.success} />
                </View>
                <Text style={styles.sectionTitle}>Tests Recommended</Text>
                <View style={[styles.medCountBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.medCountText, { color: THEME.success }]}>
                    {prescription.testsRecommended.length}
                  </Text>
                </View>
              </View>
              {prescription.testsRecommended.map((test: string, index: number) => (
                <View key={index} style={styles.testItem}>
                  <LinearGradient
                    colors={THEME.gradient.success}
                    style={styles.testBullet}
                  />
                  <Text style={styles.testText}>{test}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Special Instructions ── */}
        {prescription.specialInstructions ? (
          <Animated.View style={[styles.animCard, {
            opacity: cardAnims[4],
            transform: [{ translateY: cardAnims[4].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
          }]}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBadge, { backgroundColor: sh.ground('#FFFBEB', '#F59E0B') }]}>
                  <Ionicons name="information-circle-outline" size={16} color={THEME.warning} />
                </View>
                <Text style={styles.sectionTitle}>Special Instructions</Text>
              </View>
              <View style={styles.instructionsBlock}>
                <Text style={styles.instructionsText}>{prescription.specialInstructions}</Text>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Follow-up Date ── */}
        {prescription.followUpDate && (
          <Animated.View style={[styles.animCard, {
            opacity: cardAnims[5],
            transform: [{ translateY: cardAnims[5].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
          }]}>
            <LinearGradient colors={sh.grad(['#F0F7FF', '#D6E8FF'])} style={styles.followUpCard}>
              <LinearGradient colors={THEME.gradient.primary} style={styles.followUpIconWrap}>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.followUpInfo}>
                <Text style={styles.followUpLabel}>Follow-up Appointment</Text>
                <Text style={styles.followUpDate}>{formatDate(prescription.followUpDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.primary} />
            </LinearGradient>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Bottom Action Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => dispatch(downloadPDF(prescription.prescriptionId))}
          disabled={downloading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={THEME.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.downloadButtonGradient}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Downloading…' : 'Download PDF'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => dispatch(sharePrescription(prescription.prescriptionId))}
          disabled={sharing}
          activeOpacity={0.85}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={THEME.primary} />
          ) : (
            <Ionicons name="share-social-outline" size={20} color={THEME.primary} />
          )}
          <Text style={styles.shareButtonText}>
            {sharing ? 'Sharing…' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const makeStyles = (THEME: ReturnType<typeof makeTHEME>, sh: DarkShift) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
  },

  // Center / loading / error
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: sh.n('#F8FBFF', 'bg'),
    padding: 40,
    gap: 8,
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 17,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
  },
  loadingSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
  },
  errorIconWrap: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorIconGradient: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
  },
  errorSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 24) + 10
      : 14,
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
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  headerBadge: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  animCard: {
    marginBottom: 14,
  },

  // Card
  card: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: sh.n('#F1F5F9', 'lineSoft'),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },

  // Doctor
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  doctorAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: sh.hue('#2A7FFF'),
  },
  doctorQuals: {
    fontSize: 11,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
  },
  verifiedBadge: {
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issuedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
  },
  issuedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  issuedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: sh.n('#64748B', 'inkMuted'),
  },
  issuedDate: {
    fontSize: 13,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
  },

  // Patient strip
  patientStrip: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: sh.hue('#B8D4FF'),
  },
  patientItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  patientItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: sh.n('#94A3B8', 'inkFaint'),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  patientItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
  },
  patientDivider: {
    width: 1,
    backgroundColor: sh.hue('#B8D4FF'),
    alignSelf: 'stretch',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
    flex: 1,
    letterSpacing: -0.2,
  },
  medCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: sh.ground('#EAF3FF', '#2A7FFF'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  medCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: sh.hue('#2A7FFF'),
  },

  // Diagnosis
  diagnosisBlock: {
    backgroundColor: sh.n('#F8FBFF', 'bg'),
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: sh.hue('#2A7FFF'),
  },
  diagnosisText: {
    fontSize: 14,
    fontWeight: '500',
    color: sh.hue('#374151'),
    lineHeight: 20,
  },

  // Medications
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 12,
  },
  medicationBorder: {
    borderBottomWidth: 1,
    borderBottomColor: sh.n('#F1F5F9', 'lineSoft'),
  },
  medNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  medNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
  medContent: {
    flex: 1,
    gap: 6,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: sh.n('#0F172A', 'ink'),
  },
  medTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  medTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  medTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  medInstructionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 2,
  },
  medInstructions: {
    fontSize: 12,
    fontWeight: '500',
    color: sh.n('#64748B', 'inkMuted'),
    flex: 1,
    lineHeight: 16,
  },

  // Tests
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  testBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  testText: {
    fontSize: 14,
    fontWeight: '500',
    color: sh.hue('#374151'),
    flex: 1,
  },

  // Instructions
  instructionsBlock: {
    backgroundColor: sh.ground('#FFFBEB', '#F59E0B'),
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: sh.hue('#F59E0B'),
  },
  instructionsText: {
    fontSize: 14,
    fontWeight: '500',
    color: sh.hue('#374151'),
    lineHeight: 22,
  },

  // Follow-up
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: sh.hue('#B8D4FF'),
  },
  followUpIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followUpInfo: {
    flex: 1,
  },
  followUpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: sh.n('#94A3B8', 'inkFaint'),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  followUpDate: {
    fontSize: 16,
    fontWeight: '800',
    color: sh.hue('#1E40AF'),
    letterSpacing: -0.3,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 12,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  downloadButton: {
    flex: 1.6,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: sh.hue('#2A7FFF'),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  downloadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
    letterSpacing: -0.2,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: sh.hue('#BFDBFE'),
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: sh.hue('#2A7FFF'),
  },
});

export default PrescriptionViewScreen;