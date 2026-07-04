import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchPatientHistory,
  selectVisit,
  resetPatientHistory,
} from './patientHistorySlice';
import type { PastVisit } from './patientHistorySlice';
import type { DoctorStackParamList } from '../../../../models/healthcare/types';

type RouteParams = RouteProp<DoctorStackParamList, 'PatientHistory'>;

// ── Theme ─────────────────────────────────────
import { DOCTOR_THEME as THEME } from '../../../../constants/DoctorTheme';

// ── Helpers ───────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const VISIT_ACCENTS: [string, string][] = [
  THEME.gradient.primary,
  THEME.gradient.secondary,
  THEME.gradient.success,
  ['#F59E0B', '#D97706'],
];

// ── Visit Card ────────────────────────────────

const VisitCard: React.FC<{
  visit: PastVisit;
  index: number;
  onPress: () => void;
  isSelected: boolean;
}> = ({ visit, index, onPress, isSelected }) => {
  const gradient = VISIT_ACCENTS[index % VISIT_ACCENTS.length];
  const isVideo = visit.type === 'video';
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      delay: index * 55,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <TouchableOpacity
        style={[styles.visitCard, isSelected && styles.visitCardSelected]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.visitStripe}
        />

        <View style={styles.visitBody}>
          {/* Header row */}
          <View style={styles.visitHeaderRow}>
            <View style={[
              styles.visitTypeBadge,
              { backgroundColor: isVideo ? '#EAF3FF' : THEME.primaryLight },
            ]}>
              <Ionicons
                name={isVideo ? 'videocam-outline' : 'business-outline'}
                size={12}
                color={isVideo ? THEME.accent : THEME.primary}
              />
              <Text style={[styles.visitTypeText, { color: isVideo ? THEME.accent : THEME.primary }]}>
                {isVideo ? 'Video' : 'In-Clinic'}
              </Text>
            </View>
            <Text style={styles.visitDateText}>{formatDate(visit.date)}</Text>
          </View>

          {/* Diagnosis */}
          <Text style={styles.visitDiagnosis}>{visit.diagnosis}</Text>

          {/* Symptoms */}
          {visit.symptoms.length > 0 && (
            <View style={styles.symptomsRow}>
              {visit.symptoms.slice(0, 3).map((s, i) => (
                <View key={i} style={styles.symptomTag}>
                  <Text style={styles.symptomText}>{s}</Text>
                </View>
              ))}
              {visit.symptoms.length > 3 && (
                <Text style={styles.moreText}>+{visit.symptoms.length - 3}</Text>
              )}
            </View>
          )}

          {/* Notes */}
          {visit.notes && (
            <Text style={styles.visitNotes} numberOfLines={2}>{visit.notes}</Text>
          )}

          {/* Footer badges */}
          <View style={styles.visitFooter}>
            {visit.prescriptionId && (
              <View style={styles.rxBadge}>
                <MaterialCommunityIcons name="prescription" size={11} color={THEME.primary} />
                <Text style={styles.rxBadgeText}>Prescription</Text>
              </View>
            )}
            {visit.followUp && (
              <View style={styles.followUpBadge}>
                <Ionicons name="calendar-outline" size={11} color={THEME.warning} />
                <Text style={styles.followUpText}>Follow-up: {formatDate(visit.followUp)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Component ────────────────────────────

const PatientHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const dispatch = useAppDispatch();
  const { patientId } = route.params;

  const { patient, selectedVisit, loading, error } = useAppSelector(
    (state) => state.patientHistory,
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const hasAnimated = useRef(false);

  useEffect(() => {
    dispatch(fetchPatientHistory(patientId));
    return () => { dispatch(resetPatientHistory()); };
  }, [dispatch, patientId]);

  useEffect(() => {
    if (!loading && patient && !hasAnimated.current) {
      hasAnimated.current = true;
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, patient]);

  const handleVisitPress = useCallback(
    (visit: PastVisit) => dispatch(selectVisit(visit)),
    [dispatch],
  );

  // ── Loading ───────────────────────────────────

  if (loading && !patient) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient History</Text>
          <View style={styles.backBtn} />
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading patient history…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────

  if (error && !patient) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient History</Text>
          <View style={styles.backBtn} />
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load history</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchPatientHistory(patientId))} activeOpacity={0.85}>
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) return null;

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Patient History</Text>
            <Text style={styles.headerSubtitle}>{patient.visits.length} visit{patient.visits.length !== 1 ? 's' : ''} recorded</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Patient Info Card ── */}
        <View style={styles.patientCard}>
          <View style={styles.patientRow}>
            <LinearGradient colors={THEME.gradient.primary} style={styles.patientAvatar}>
              <MaterialCommunityIcons name="account" size={28} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.patientName}</Text>
              <Text style={styles.patientMeta}>
                {patient.age} yrs  ·  {patient.gender}  ·  {patient.bloodGroup}
              </Text>
              {patient.phone ? (
                <Text style={styles.patientPhone}>{patient.phone}</Text>
              ) : null}
            </View>
            <View style={styles.visitCountBadge}>
              <Text style={styles.visitCountNum}>{patient.visits.length}</Text>
              <Text style={styles.visitCountLabel}>Visits</Text>
            </View>
          </View>
        </View>

        {/* ── Health Alerts Strip ── */}
        {(patient.allergies.length > 0 || patient.chronicConditions.length > 0) && (
          <View style={styles.alertsCard}>
            {patient.allergies.length > 0 && (
              <View style={styles.alertSection}>
                <View style={styles.alertSectionHeader}>
                  <View style={[styles.alertDot, { backgroundColor: THEME.error }]} />
                  <Text style={[styles.alertSectionTitle, { color: THEME.error }]}>Allergies</Text>
                </View>
                <View style={styles.chipRow}>
                  {patient.allergies.map((a, i) => (
                    <View key={i} style={styles.allergyChip}>
                      <Ionicons name="warning" size={11} color={THEME.error} />
                      <Text style={styles.allergyChipText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {patient.allergies.length > 0 && patient.chronicConditions.length > 0 && (
              <View style={styles.alertsDivider} />
            )}
            {patient.chronicConditions.length > 0 && (
              <View style={styles.alertSection}>
                <View style={styles.alertSectionHeader}>
                  <View style={[styles.alertDot, { backgroundColor: THEME.warning }]} />
                  <Text style={[styles.alertSectionTitle, { color: THEME.warning }]}>Chronic Conditions</Text>
                </View>
                <View style={styles.chipRow}>
                  {patient.chronicConditions.map((c, i) => (
                    <View key={i} style={styles.conditionChip}>
                      <MaterialCommunityIcons name="medical-bag" size={11} color={THEME.warning} />
                      <Text style={styles.conditionChipText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Visit History ── */}
        <View style={styles.visitsSection}>
          <View style={styles.visitsSectionHeader}>
            <View style={styles.visitsSectionDot} />
            <Text style={styles.visitsSectionTitle}>Visit History</Text>
            <View style={styles.visitsCountBadge}>
              <Text style={styles.visitsCountText}>{patient.visits.length}</Text>
            </View>
          </View>

          {patient.visits.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="history" size={36} color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Visit History</Text>
              <Text style={styles.emptySubtitle}>This patient has no recorded visits yet</Text>
            </View>
          ) : (
            <View style={styles.visitsList}>
              {patient.visits.map((visit, i) => (
                <VisitCard
                  key={visit.visitId}
                  visit={visit}
                  index={i}
                  onPress={() => handleVisitPress(visit)}
                  isSelected={selectedVisit?.visitId === visit.visitId}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default PatientHistoryScreen;

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Loading / Error
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 6,
  },
  retryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  retryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 14,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
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
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Patient card
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  patientAvatar: {
    width: 58,
    height: 58,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    gap: 3,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  patientMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  patientPhone: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  visitCountBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  visitCountNum: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: -0.4,
  },
  visitCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Alerts card
  alertsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  alertSection: {
    gap: 8,
  },
  alertSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  allergyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.error,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  conditionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.warning,
  },

  // Visits section
  visitsSection: {
    gap: 14,
  },
  visitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitsSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  visitsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  visitsCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
  },

  visitsList: {
    gap: 10,
  },

  // Visit card
  visitCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  visitCardSelected: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFEFF',
  },
  visitStripe: {
    width: 5,
    alignSelf: 'stretch',
  },
  visitBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  visitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visitTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  visitDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  visitDiagnosis: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  symptomTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  symptomText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  visitNotes: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 17,
  },
  visitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  rxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rxBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.primary,
  },
  followUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  followUpText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.warning,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
});