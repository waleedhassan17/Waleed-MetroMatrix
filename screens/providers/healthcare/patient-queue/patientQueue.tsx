import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchQueue,
  startConsultation,
  completeConsultation,
  skipPatient,
  callNextPatient,
  resetPatientQueue,
  QueuePatient,
  QueueStatus,
} from './patientQueueSlice';

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    success: ['#10B981', '#059669'] as [string, string],
    secondary: ['#5A9FFF', '#1E6AE1'] as [string, string],
    warm: ['#F59E0B', '#EF4444'] as [string, string],
  },
};

// ── Helpers ───────────────────────────────────

const formatTime12 = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const STATUS_CONFIG: Record<QueueStatus, {
  label: string; color: string; bg: string; dot: string;
}> = {
  waiting:     { label: 'Waiting',     color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  'in-progress': { label: 'Active',    color: THEME.primary, bg: THEME.primaryLight, dot: THEME.primary },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7', dot: '#10B981' },
  skipped:     { label: 'Skipped',     color: '#94A3B8', bg: '#F8FBFF', dot: '#CBD5E1' },
};

type FilterTab = 'all' | 'waiting' | 'in-progress' | 'completed';

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Active', value: 'in-progress' },
  { label: 'Done', value: 'completed' },
];

// ── Current Patient Card ──────────────────────

const CurrentPatientCard: React.FC<{
  patient: QueuePatient;
  onComplete: () => void;
  onSkip: () => void;
}> = ({ patient, onComplete, onSkip }) => {
  const isVideo = patient.type === 'video';
  const initials = patient.patientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.currentCard}>
      {/* Card header */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.currentCardHeader}
      >
        <View style={styles.currentBadgeRow}>
          <View style={styles.currentLiveBadge}>
            <Animated.View style={styles.currentLiveDot} />
            <Text style={styles.currentLiveText}>In Consultation</Text>
          </View>
          <View style={styles.currentTokenBadge}>
            <Text style={styles.currentTokenText}>#{patient.tokenNumber}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Patient info */}
      <View style={styles.currentBody}>
        <View style={styles.currentAvatarWrap}>
          <LinearGradient colors={THEME.gradient.primary} style={styles.currentAvatar}>
            <Text style={styles.currentInitials}>{initials}</Text>
          </LinearGradient>
          <View style={[
            styles.currentTypeChip,
            { backgroundColor: isVideo ? '#EAF3FF' : THEME.primaryLight },
          ]}>
            <Ionicons
              name={isVideo ? 'videocam-outline' : 'business-outline'}
              size={11}
              color={isVideo ? THEME.accent : THEME.primary}
            />
            <Text style={[styles.currentTypeText, { color: isVideo ? THEME.accent : THEME.primary }]}>
              {isVideo ? 'Video' : 'In-Clinic'}
            </Text>
          </View>
        </View>

        <View style={styles.currentInfo}>
          <Text style={styles.currentName}>{patient.patientName}</Text>
          <Text style={styles.currentMeta}>
            {patient.age}y, {patient.gender}  ·  {formatTime12(patient.timeSlot.start)}
          </Text>
          {patient.symptoms ? (
            <Text style={styles.currentSymptoms} numberOfLines={2}>{patient.symptoms}</Text>
          ) : null}

          {patient.history.length > 0 && (
            <View style={styles.currentHistoryRow}>
              <Ionicons name="time-outline" size={12} color="#94A3B8" />
              <Text style={styles.currentHistoryText} numberOfLines={1}>
                Last: {patient.history[0].diagnosis} ({patient.history[0].date})
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.currentActions}>
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.8}>
          <Ionicons name="arrow-forward-outline" size={17} color="#64748B" />
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.completeBtn} onPress={onComplete} activeOpacity={0.85}>
          <LinearGradient
            colors={THEME.gradient.success}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeBtnGradient}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.completeBtnText}>Mark Complete</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Patient Row ───────────────────────────────

const PatientRow: React.FC<{
  patient: QueuePatient;
  index: number;
  onStart: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasCurrentPatient: boolean;
}> = ({ patient, index, onStart, isExpanded, onToggleExpand, hasCurrentPatient }) => {
  const cfg = STATUS_CONFIG[patient.status];
  const isVideo = patient.type === 'video';
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      tension: 100,
      friction: 9,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  return (
    <TouchableOpacity
      style={[
        styles.queueRow,
        patient.status === 'in-progress' && styles.queueRowActive,
        (patient.status === 'completed' || patient.status === 'skipped') && styles.queueRowDim,
      ]}
      onPress={onToggleExpand}
      activeOpacity={0.8}
    >
      {/* Token badge */}
      <View style={[styles.tokenBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.tokenNum, { color: cfg.color }]}>#{patient.tokenNumber}</Text>
      </View>

      <View style={styles.queueRowInfo}>
        {/* Name + status */}
        <View style={styles.queueNameRow}>
          <Text style={styles.queuePatientName} numberOfLines={1}>{patient.patientName}</Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <View style={[styles.statusPillDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Meta chips */}
        <View style={styles.queueMetaRow}>
          <Text style={styles.queueMeta}>{patient.age}y, {patient.gender}</Text>
          <View style={styles.metaSep} />
          <View style={[styles.typeMiniChip, { backgroundColor: isVideo ? '#EAF3FF' : THEME.primaryLight }]}>
            <Ionicons
              name={isVideo ? 'videocam-outline' : 'business-outline'}
              size={10}
              color={isVideo ? THEME.accent : THEME.primary}
            />
            <Text style={[styles.typeMiniText, { color: isVideo ? THEME.accent : THEME.primary }]}>
              {isVideo ? 'Video' : 'Clinic'}
            </Text>
          </View>
          <View style={styles.metaSep} />
          <Text style={styles.queueMeta}>{formatTime12(patient.timeSlot.start)}</Text>
        </View>

        {/* Wait time */}
        {patient.status === 'waiting' && patient.estimatedWaitMinutes > 0 && (
          <View style={styles.waitRow}>
            <Ionicons name="hourglass-outline" size={11} color={THEME.warning} />
            <Text style={styles.waitText}>~{patient.estimatedWaitMinutes} min wait</Text>
          </View>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <Animated.View style={styles.expandedBlock}>
            {patient.symptoms ? (
              <View style={styles.expandedRow}>
                <Ionicons name="bandage-outline" size={13} color="#64748B" />
                <Text style={styles.expandedText}>{patient.symptoms}</Text>
              </View>
            ) : null}

            {patient.history.length > 0 ? (
              <View style={styles.historyBlock}>
                <Text style={styles.historyBlockTitle}>Visit History</Text>
                {patient.history.slice(0, 3).map((h, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <View style={styles.historyDot} />
                    <Text style={styles.historyDate}>{h.date}</Text>
                    <Text style={styles.historyDiag} numberOfLines={1}>{h.diagnosis}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noHistory}>No prior visit history</Text>
            )}

            {patient.status === 'waiting' && !hasCurrentPatient && (
              <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.85}>
                <LinearGradient
                  colors={THEME.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startBtnGradient}
                >
                  <Ionicons name="play-circle" size={17} color="#FFFFFF" />
                  <Text style={styles.startBtnText}>Start Consultation</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>

      <Ionicons
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={15}
        color="#CBD5E1"
        style={{ marginLeft: 6, marginTop: 2 }}
      />
    </TouchableOpacity>
  );
};

// ── Main Component ────────────────────────────

const PatientQueueScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;

  const { queue, currentPatient, loading, error } = useAppSelector(
    (state) => state.patientQueue,
  );

  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    dispatch(fetchQueue());
    return () => { dispatch(resetPatientQueue()); };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && initialLoadDone.current && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }
    if (loading) {
      initialLoadDone.current = true;
    }
  }, [loading]);

  // Tab indicator animation
  const tabIndex = FILTER_TABS.findIndex((t) => t.value === filterTab);
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [tabIndex]);

  const currentPatientData = useMemo(
    () => queue.find((p) => p.queueId === currentPatient) ?? null,
    [queue, currentPatient],
  );

  const filteredQueue = useMemo(() => {
    if (filterTab === 'all') return queue;
    return queue.filter((p) => p.status === filterTab);
  }, [queue, filterTab]);

  const stats = useMemo(() => ({
    total: queue.length,
    waiting: queue.filter((p) => p.status === 'waiting').length,
    inProgress: queue.filter((p) => p.status === 'in-progress').length,
    completed: queue.filter((p) => p.status === 'completed').length,
  }), [queue]);

  const handleStart = useCallback((queueId: string) => {
    if (currentPatient) {
      Alert.alert('Active Consultation', 'Please complete or skip the current patient first.');
      return;
    }
    dispatch(startConsultation(queueId));
  }, [dispatch, currentPatient]);

  const handleComplete = useCallback(() => {
    if (!currentPatient) return;
    Alert.alert('Complete Consultation', 'Mark this consultation as completed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => dispatch(completeConsultation(currentPatient)) },
    ]);
  }, [dispatch, currentPatient]);

  const handleSkip = useCallback(() => {
    if (!currentPatient) return;
    Alert.alert('Skip Patient', 'Skip this patient and move to the next?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => dispatch(skipPatient(currentPatient)) },
    ]);
  }, [dispatch, currentPatient]);

  const handleCallNext = useCallback(() => {
    if (currentPatient) {
      Alert.alert('Active Consultation', 'Please complete or skip the current patient first.');
      return;
    }
    dispatch(callNextPatient());
  }, [dispatch, currentPatient]);

  const handleToggleExpand = useCallback((queueId: string) => {
    setExpandedId((prev) => (prev === queueId ? null : queueId));
  }, []);

  // ── Loading ───────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          {isInTab ? <View style={styles.headerBtn} /> : (
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>)}
          <Text style={styles.headerTitle}>Patient Queue</Text>
          <View style={styles.headerBtn} />
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading queue…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          {isInTab ? <View style={styles.headerBtn} /> : (
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>)}
          <Text style={styles.headerTitle}>Patient Queue</Text>
          <View style={styles.headerBtn} />
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load queue</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchQueue())} activeOpacity={0.85}>
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
        style={styles.headerGradient}
      >
        <View style={styles.headerNav}>
          {isInTab ? <View style={styles.headerBtn} /> : (
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>)}
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Patient Queue</Text>
            <Text style={styles.headerSubtitle}>{stats.waiting} waiting  ·  {stats.completed} completed</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => dispatch(fetchQueue())} activeOpacity={0.8}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Stats Strip ── */}
        <LinearGradient colors={['#F0F7FF', '#EAF3FF']} style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: THEME.warning }]}>{stats.waiting}</Text>
            <Text style={[styles.statLabel, { color: THEME.warning }]}>Waiting</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: THEME.primary }]}>{stats.inProgress}</Text>
            <Text style={[styles.statLabel, { color: THEME.primary }]}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: THEME.success }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: THEME.success }]}>Done</Text>
          </View>
        </LinearGradient>

        {/* ── Current Patient ── */}
        {currentPatientData && (
          <View style={styles.section}>
            <CurrentPatientCard
              patient={currentPatientData}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          </View>
        )}

        {/* ── Call Next Button ── */}
        {!currentPatient && stats.waiting > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.callNextBtn} onPress={handleCallNext} activeOpacity={0.85}>
              <LinearGradient
                colors={THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.callNextBtnGradient}
              >
                <MaterialCommunityIcons name="account-voice" size={22} color="#FFFFFF" />
                <Text style={styles.callNextBtnText}>Call Next Patient</Text>
                <View style={styles.callNextCountBadge}>
                  <Text style={styles.callNextCountText}>{stats.waiting}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Filter Tabs ── */}
        <View style={styles.section}>
          <View style={styles.filterTabs}>
            <Animated.View
              style={[
                styles.filterTabIndicator,
                {
                  left: tabIndicatorAnim.interpolate({
                    inputRange: [0, 1, 2, 3],
                    outputRange: ['1%', '25.5%', '50%', '75%'],
                  }),
                  width: '24%',
                },
              ]}
            >
              <LinearGradient
                colors={THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
              />
            </Animated.View>

            {FILTER_TABS.map((tab) => {
              const isActive = filterTab === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  style={styles.filterTab}
                  onPress={() => setFilterTab(tab.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Queue List ── */}
        <View style={styles.section}>
          <View style={styles.queueSectionHeader}>
            <View style={styles.queueSectionDot} />
            <Text style={styles.queueSectionTitle}>
              {filterTab === 'all' ? "Today's Queue" : FILTER_TABS.find((t) => t.value === filterTab)?.label}
            </Text>
            <View style={styles.queueCountBadge}>
              <Text style={styles.queueCountText}>{filteredQueue.length}</Text>
            </View>
          </View>

          {filteredQueue.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={36} color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No patients</Text>
              <Text style={styles.emptySubtitle}>No patients match the selected filter</Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {filteredQueue.map((patient, index) => (
                <PatientRow
                  key={patient.queueId}
                  patient={patient}
                  index={index}
                  onStart={() => handleStart(patient.queueId)}
                  isExpanded={expandedId === patient.queueId}
                  onToggleExpand={() => handleToggleExpand(patient.queueId)}
                  hasCurrentPatient={!!currentPatient}
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

export default PatientQueueScreen;

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
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  errorSubtext: { fontSize: 14, fontWeight: '500', color: '#64748B', textAlign: 'center', marginBottom: 6 },
  retryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  retryBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 16 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#B8D4FF',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 30, backgroundColor: '#B8D4FF' },

  // Current patient card
  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  currentCardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  currentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  currentLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  currentLiveText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  currentTokenBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  currentTokenText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  currentBody: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  currentAvatarWrap: {
    alignItems: 'center',
    gap: 6,
  },
  currentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentInitials: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  currentTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  currentTypeText: { fontSize: 10, fontWeight: '700' },
  currentInfo: { flex: 1, gap: 4 },
  currentName: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  currentMeta: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  currentSymptoms: { fontSize: 13, fontWeight: '500', color: '#64748B', lineHeight: 18 },
  currentHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  currentHistoryText: { fontSize: 11, fontWeight: '500', color: '#94A3B8', flex: 1 },
  currentActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: '#F8FBFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  skipBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  completeBtn: { flex: 2, borderRadius: 13, overflow: 'hidden' },
  completeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
  },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Call next
  callNextBtn: { borderRadius: 10, overflow: 'hidden' },
  callNextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  callNextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  callNextCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  callNextCountText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // Filter tabs
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    height: 46,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  filterTabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 0,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  filterTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filterTabTextActive: { color: '#FFFFFF' },

  // Queue list
  queueSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  queueSectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary },
  queueSectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2, flex: 1 },
  queueCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueCountText: { fontSize: 11, fontWeight: '800', color: THEME.primary },
  queueList: { gap: 8 },

  // Queue row
  queueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  queueRowActive: { borderColor: '#BFDBFE', backgroundColor: '#FAFEFF' },
  queueRowDim: { opacity: 0.65 },
  tokenBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenNum: { fontSize: 13, fontWeight: '800' },
  queueRowInfo: { flex: 1, gap: 6 },
  queueNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queuePatientName: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  queueMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  queueMeta: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  metaSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  typeMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeMiniText: { fontSize: 10, fontWeight: '700' },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waitText: { fontSize: 11, fontWeight: '700', color: THEME.warning },

  // Expanded
  expandedBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  expandedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  expandedText: { fontSize: 13, fontWeight: '500', color: '#64748B', flex: 1, lineHeight: 18 },
  historyBlock: { gap: 6 },
  historyBlockTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary },
  historyDate: { fontSize: 11, fontWeight: '600', color: '#94A3B8', width: 72 },
  historyDiag: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
  noHistory: { fontSize: 12, fontWeight: '500', color: '#CBD5E1', fontStyle: 'italic' },
  startBtn: { borderRadius: 13, overflow: 'hidden', marginTop: 4 },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  startBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

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
  emptyIconWrap: { width: 72, height: 72, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, fontWeight: '500', color: '#64748B', textAlign: 'center' },
});