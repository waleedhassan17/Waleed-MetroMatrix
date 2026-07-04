import React, { useEffect, useRef } from 'react';
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
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchDoctorProfile,
  toggleAvailability,
  resetDoctorProfile,
} from './doctorProfileSlice';

// ── Theme ─────────────────────────────────────
import { DOCTOR_THEME as THEME } from '../../../../constants/DoctorTheme';

const formatCurrency = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString()}`;

// ── Info Row ──────────────────────────────────

const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: string;
  iconLib?: 'ion' | 'mci';
  accent?: string;
}> = ({ icon, label, value, iconLib = 'ion', accent = THEME.primary }) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIconWrap, { backgroundColor: `${accent}18` }]}>
      {iconLib === 'mci' ? (
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
      ) : (
        <Ionicons name={icon as any} size={16} color={accent} />
      )}
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// ── Stat Box ──────────────────────────────────

const StatBox: React.FC<{
  icon: string;
  value: string;
  label: string;
}> = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    <MaterialCommunityIcons name={icon as any} size={20} color="rgba(255,255,255,0.8)" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Main Component ────────────────────────────

const DoctorProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;
  const { profile, loading, error } = useAppSelector((state) => state.doctorProfile);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const sectionAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  const hasAnimated = useRef(false);

  useEffect(() => {
    dispatch(fetchDoctorProfile());
    return () => { dispatch(resetDoctorProfile()); };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && profile && !hasAnimated.current) {
      hasAnimated.current = true;
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      sectionAnims.forEach(a => a.setValue(0));
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
        Animated.stagger(
          90,
          sectionAnims.map((a) =>
            Animated.spring(a, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
          )
        ),
      ]).start();
    }
  }, [loading, profile]);

  // ── Loading ───────────────────────────────────

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.loadingHeader}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.loadingHeader}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load profile</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchDoctorProfile())} activeOpacity={0.85}>
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero Header ── */}
        <LinearGradient
          colors={THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          {/* Nav */}
          <View style={styles.headerNav}>
            {isInTab ? <View style={styles.headerBtn} /> : (
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>)}
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Avatar + name */}
          <View style={styles.profileCenter}>
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                style={styles.avatarRing}
              >
                <View style={styles.avatarInner}>
                  <MaterialCommunityIcons name="doctor" size={44} color={THEME.primary} />
                </View>
              </LinearGradient>
              {profile.isAvailable && (
                <View style={styles.availabilityDot} />
              )}
            </View>

            <Text style={styles.profileName}>{profile.fullName}</Text>
            <Text style={styles.profileSpec}>{profile.specialization}</Text>
            <Text style={styles.profileQual}>{profile.qualification}  ·  {profile.experience} yrs</Text>

            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={13} color="#FFFFFF" />
                <Text style={styles.verifiedText}>Verified Doctor</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsStrip}>
            <StatBox icon="star" value={profile.rating.toFixed(1)} label="Rating" />
            <View style={styles.statsDivider} />
            <StatBox icon="account-group" value={profile.totalPatients.toLocaleString()} label="Patients" />
            <View style={styles.statsDivider} />
            <StatBox icon="comment-text-outline" value={profile.totalReviews.toString()} label="Reviews" />
          </View>

          {/* Completeness Meter */}
          <View style={styles.completenessWrap}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessText}>Profile Completeness</Text>
              <Text style={styles.completenessPercent}>85%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '85%' }]} />
            </View>
          </View>
        </LinearGradient>

        {/* ── Availability Toggle (overlaps gradient) ── */}
        <View style={styles.availCardWrap}>
          <Animated.View
            style={{
              opacity: sectionAnims[0],
              transform: [{ scale: sectionAnims[0].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            }}
          >
            <View style={[
              styles.availCard,
              profile.isAvailable && styles.availCardActive,
            ]}>
              <View style={styles.availLeft}>
                <View style={[
                  styles.availIconWrap,
                  { backgroundColor: profile.isAvailable ? '#DCFCE7' : '#F1F5F9' },
                ]}>
                  <MaterialCommunityIcons
                    name="clock-check-outline"
                    size={20}
                    color={profile.isAvailable ? THEME.success : '#94A3B8'}
                  />
                </View>
                <View style={styles.availInfo}>
                  <Text style={styles.availTitle}>Availability</Text>
                  <Text style={[
                    styles.availStatus,
                    { color: profile.isAvailable ? THEME.success : '#94A3B8' },
                  ]}>
                    {profile.isAvailable ? 'Accepting patients' : 'Not available'}
                  </Text>
                </View>
              </View>
              <Switch
                value={profile.isAvailable}
                onValueChange={(_value: boolean) => { dispatch(toggleAvailability()); }}
                trackColor={{ false: '#E2E8F0', true: `${THEME.success}55` }}
                thumbColor={profile.isAvailable ? THEME.success : '#CBD5E1'}
                ios_backgroundColor="#E2E8F0"
              />
            </View>
          </Animated.View>
        </View>

        {/* ── Personal Info ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[1],
          transform: [{ translateY: sectionAnims[1].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            <View style={styles.card}>
              <InfoRow icon="mail-outline" label="Email" value={profile.email} />
              <View style={styles.infoDivider} />
              <InfoRow icon="call-outline" label="Phone" value={profile.phone} />
              <View style={styles.infoDivider} />
              <InfoRow icon="briefcase-outline" label="Experience" value={`${profile.experience} years`} accent={THEME.accent} />
              <View style={styles.infoDivider} />
              <InfoRow icon="shield-checkmark-outline" label="PMC Number" value={profile.pmcNumber} accent={THEME.success} />
            </View>
          </View>
        </Animated.View>

        {/* ── About ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[2],
          transform: [{ translateY: sectionAnims[2].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: THEME.accent }]} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <View style={[styles.card, styles.aboutCard]}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Clinic & Fees ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[3],
          transform: [{ translateY: sectionAnims[3].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: THEME.success }]} />
              <Text style={styles.sectionTitle}>Clinic & Fees</Text>
            </View>
            <View style={styles.card}>
              <InfoRow icon="hospital-box-outline" label="Clinic" value={profile.clinicName} iconLib="mci" />
              <View style={styles.infoDivider} />
              <InfoRow icon="map-marker-outline" label="Address" value={profile.clinicAddress} iconLib="mci" accent="#64748B" />
              <View style={styles.infoDivider} />
              {/* Fee cards row */}
              <View style={styles.feeRow}>
                <LinearGradient colors={THEME.gradient.primary} style={styles.feeCard}>
                  <Ionicons name="business-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.feeCardAmount}>
                    {formatCurrency(profile.consultationFee, profile.currency)}
                  </Text>
                  <Text style={styles.feeCardLabel}>In-Clinic Fee</Text>
                </LinearGradient>
                <LinearGradient colors={THEME.gradient.success} style={styles.feeCard}>
                  <MaterialCommunityIcons name="video-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.feeCardAmount}>
                    {formatCurrency(profile.videoConsultationFee, profile.currency)}
                  </Text>
                  <Text style={styles.feeCardLabel}>Video Fee</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Languages ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[4],
          transform: [{ translateY: sectionAnims[4].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: THEME.warning }]} />
              <Text style={styles.sectionTitle}>Languages</Text>
            </View>
            <View style={styles.langRow}>
              {profile.languages.map((lang, i) => (
                <View key={i} style={styles.langChip}>
                  <MaterialCommunityIcons name="translate" size={13} color={THEME.primary} />
                  <Text style={styles.langChipText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default DoctorProfileScreen;

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Loading / Error
  loadingHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
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
  loadingText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  errorSubtext: { fontSize: 14, fontWeight: '500', color: '#94A3B8', textAlign: 'center', marginBottom: 6 },
  retryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  retryBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  scrollContent: { paddingBottom: 40 },

  // Profile hero
  profileHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },

  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  profileCenter: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 5,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  profileSpec: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  profileQual: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  statLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.3 },
  statsDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Completeness Meter
  completenessWrap: {
    marginTop: 16,
    paddingHorizontal: 10,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completenessText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  completenessPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981', // green for completeness
    borderRadius: 3,
  },

  // Availability card (overlaps gradient)
  availCardWrap: {
    paddingHorizontal: 20,
    marginTop: -18,
    marginBottom: 14,
  },
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 5 },
    }),
  },
  availCardActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  availLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  availIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availInfo: { flex: 1 },
  availTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  availStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Sections
  sectionAnim: { marginBottom: 14 },
  sectionBlock: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  aboutCard: {
    backgroundColor: '#FAFBFF',
  },
  bioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 22,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  // Fee cards
  feeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  feeCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 5,
  },
  feeCardAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  feeCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Languages
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
});