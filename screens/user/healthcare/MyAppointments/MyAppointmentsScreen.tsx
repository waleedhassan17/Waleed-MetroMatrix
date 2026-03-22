import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setActiveTab, fetchMyAppointments } from './myAppointmentsSlice';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { Appointment } from '../../../../models/healthcare/types';

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
    video: ['#5A9FFF', '#1E6AE1'] as [string, string],
  },
};

// ── Status Config ─────────────────────────────

const STATUS_CONFIG: Record<
  Appointment['status'],
  { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap; dot: string }
> = {
  pending:   { label: 'Pending',   bg: '#FFFBEB', text: '#D97706', icon: 'time-outline',              dot: '#F59E0B' },
  confirmed: { label: 'Confirmed', bg: '#F0F7FF', text: '#1857C0', icon: 'checkmark-circle-outline',  dot: '#2A7FFF' },
  completed: { label: 'Completed', bg: '#F0FDF4', text: '#16A34A', icon: 'checkmark-done-outline',    dot: '#10B981' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', icon: 'close-circle-outline',      dot: '#EF4444' },
  'no-show': { label: 'No Show',   bg: '#FEF2F2', text: '#DC2626', icon: 'alert-circle-outline',      dot: '#EF4444' },
};

const TABS = [
  { key: 'upcoming' as const, label: 'Upcoming', icon: 'calendar-outline' as const },
  { key: 'past' as const,     label: 'Past',     icon: 'checkmark-done-outline' as const },
];

// ── Component ─────────────────────────────────

const MyAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;

  const { appointments, activeTab, loading } = useAppSelector((state) => state.myAppointments);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === 'upcoming' ? 0 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  // ── Filtered Appointments ──────────────────

  const filteredAppointments = useMemo(() => {
    if (activeTab === 'upcoming') {
      return appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
    }
    return appointments.filter(
      (a) => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no-show',
    );
  }, [appointments, activeTab]);

  // ── Handlers ──────────────────────────────

  const handleTabPress = (tab: 'upcoming' | 'past') => dispatch(setActiveTab(tab));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchMyAppointments({ patientId: 'patient-1' }));
    setRefreshing(false);
  }, [dispatch]);

  const handleCancel = (id: string) => {};
  const handleReschedule = (id: string) => {};
  const handleJoinCall = (a: Appointment) => {};

  // ── Status Badge ──────────────────────────

  const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
    const cfg = STATUS_CONFIG[status];
    return (
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
        <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>
    );
  };

  // ── Appointment Card ──────────────────────

  const renderAppointmentCard = ({ item, index }: { item: Appointment; index: number }) => {
    const isUpcoming = item.status === 'pending' || item.status === 'confirmed';
    const isVideo = item.type === 'video';
    const cardFade = new Animated.Value(1);

    return (
      <View style={styles.card}>
        {/* Type stripe */}
        <LinearGradient
          colors={isVideo ? THEME.gradient.video : THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardStripe}
        />

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={[
            styles.typeIconWrap,
            { backgroundColor: isVideo ? '#EAF3FF' : THEME.primaryLight },
          ]}>
            <MaterialCommunityIcons
              name={isVideo ? 'video-outline' : 'stethoscope'}
              size={18}
              color={isVideo ? THEME.accent : THEME.primary}
            />
          </View>

          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardType}>
              {isVideo ? 'Video Consultation' : 'In-Clinic Visit'}
            </Text>
            <Text style={styles.cardId}>#{item.appointmentId.slice(-8).toUpperCase()}</Text>
          </View>

          <StatusBadge status={item.status} />
        </View>

        {/* Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="calendar-outline" size={13} color="#64748B" />
            <Text style={styles.detailChipText}>{item.date}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailChip}>
            <Ionicons name="time-outline" size={13} color="#64748B" />
            <Text style={styles.detailChipText}>{item.timeSlot.start} – {item.timeSlot.end}</Text>
          </View>
        </View>

        {item.symptoms ? (
          <View style={styles.symptomsRow}>
            <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
            <Text style={styles.symptomsText} numberOfLines={1}>{item.symptoms}</Text>
          </View>
        ) : null}

        {/* Payment */}
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Consultation Fee</Text>
          <Text style={styles.paymentAmount}>Rs. {item.payment.amount}</Text>
        </View>

        {/* Actions */}
        {isUpcoming && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCancel}
              onPress={() => handleCancel(item.appointmentId)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={15} color={THEME.error} />
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionReschedule}
              onPress={() => handleReschedule(item.appointmentId)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={15} color={THEME.primary} />
              <Text style={styles.actionRescheduleText}>Reschedule</Text>
            </TouchableOpacity>

            {isVideo && item.status === 'confirmed' && (
              <TouchableOpacity
                style={styles.actionJoin}
                onPress={() => handleJoinCall(item)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={THEME.gradient.video}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionJoinGradient}
                >
                  <MaterialCommunityIcons name="video-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.actionJoinText}>Join Call</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Empty State ──────────────────────────

  const renderEmpty = () => {
    if (loading) return null;
    const isUpcoming = activeTab === 'upcoming';
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={isUpcoming ? ['#F0F7FF', '#D6E8FF'] : ['#F0FDF4', '#DCFCE7']}
          style={styles.emptyIconWrap}
        >
          <Ionicons
            name={isUpcoming ? 'calendar-outline' : 'checkmark-done-outline'}
            size={40}
            color={isUpcoming ? THEME.primary : THEME.success}
          />
        </LinearGradient>
        <Text style={styles.emptyTitle}>
          {isUpcoming ? 'No Upcoming Appointments' : 'No Past Appointments'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isUpcoming
            ? 'Book a consultation with a doctor to get started.'
            : 'Your completed appointments will appear here.'}
        </Text>
        {isUpcoming && (
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => navigation.navigate('FindDoctor')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyActionBtnGradient}
            >
              <Ionicons name="search-outline" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Find a Doctor</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render ────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* Gradient Header + Tabs */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Title row */}
        <View style={styles.headerRow}>
          {isInTab ? <View style={styles.backButton} /> : (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>)}
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Appointments</Text>
            <Text style={styles.headerSubtitle}>
              {filteredAppointments.length} {activeTab === 'upcoming' ? 'upcoming' : 'past'}
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                left: tabIndicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['2%', '51%'],
                }),
              },
            ]}
          />
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? THEME.primary : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Content */}
      {loading && filteredAppointments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading appointments…</Text>
        </View>
      ) : (
        <Animated.View style={[styles.listWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <FlatList
            data={filteredAppointments}
            renderItem={renderAppointmentCard}
            keyExtractor={(item) => item.appointmentId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[THEME.primary]}
                tintColor={THEME.primary}
                progressViewOffset={8}
              />
            }
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  gradientHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
    height: 48,
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  tabTextActive: {
    color: THEME.primary,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingLeft: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingRight: 16,
    marginBottom: 12,
    gap: 12,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardId: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Details
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 10,
    backgroundColor: '#F8FBFF',
    borderRadius: 10,
    padding: 10,
  },
  detailChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  detailDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  symptomsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
    marginBottom: 12,
    paddingLeft: 2,
  },
  symptomsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    flex: 1,
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  actionCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.error,
  },
  actionReschedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#F0F7FF',
  },
  actionRescheduleText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  actionJoin: {
    marginLeft: 'auto',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: THEME.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  actionJoinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionJoinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyActionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  emptyActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default MyAppointmentsScreen;