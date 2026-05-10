import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  fetchAllDoctors,
  verifyDoctor,
  toggleDoctorAvailability,
  setSearchQuery,
  setVerificationFilter,
  selectFilteredDoctors,
  selectDoctorManagementLoading,
  selectVerificationFilter,
  selectDoctorSearchQuery,
  selectActionLoading,
  selectDoctorStats,
  type VerificationFilter,
} from './doctorManagementSlice';
import type { Doctor } from '../../../../models/healthcare/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44;

// ── Theme ─────────────────────────────────────

const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#f1f5f9',
  surface: '#ffffff',
  text: { primary: '#1e293b', secondary: '#64748b', tertiary: '#94a3b8' },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#e2e8f0',
  verification: {
    verified: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    pending: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    rejected: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  },
};

// ── Filter Tabs ───────────────────────────────

const FILTER_OPTIONS: { key: VerificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
];

// ── Component ─────────────────────────────────

const DoctorManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const doctors = useAppSelector(selectFilteredDoctors);
  const loading = useAppSelector(selectDoctorManagementLoading);
  const filter = useAppSelector(selectVerificationFilter);
  const searchQuery = useAppSelector(selectDoctorSearchQuery);
  const actionLoading = useAppSelector(selectActionLoading);
  const stats = useAppSelector(selectDoctorStats);

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(fetchAllDoctors());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAllDoctors()).unwrap().catch(() => {});
    setRefreshing(false);
  }, [dispatch]);

  const handleVerify = (doctor: Doctor) => {
    Alert.alert(
      'Verify Doctor',
      `Are you sure you want to verify ${doctor.qualifications[0] || 'this doctor'}?\nPMC: ${doctor.pmcNumber}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          style: 'default',
          onPress: () => dispatch(verifyDoctor({ doctorId: doctor.doctorId, action: 'verify' })),
        },
      ]
    );
  };

  const handleReject = (doctor: Doctor) => {
    Alert.alert(
      'Reject Doctor',
      `Are you sure you want to reject this doctor's verification?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => dispatch(verifyDoctor({ doctorId: doctor.doctorId, action: 'reject' })),
        },
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'verified':
        return COLORS.verification.verified;
      case 'rejected':
        return COLORS.verification.rejected;
      default:
        return COLORS.verification.pending;
    }
  };

  // ── Render Doctor Card ──────────────────────

  const renderDoctorCard = ({ item, index }: { item: Doctor; index: number }) => {
    const statusStyle = getStatusStyle(item.verificationStatus);

    return (
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={[COLORS.primaryLight, COLORS.primary]}
              style={styles.avatar}
            >
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </LinearGradient>
            {item.isAvailable && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {item.qualifications[0] || 'Doctor'}
            </Text>
            <Text style={styles.specialtyText} numberOfLines={1}>
              PMC: {item.pmcNumber}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.verificationStatus.charAt(0).toUpperCase() + item.verificationStatus.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{item.totalPatients} patients</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{item.experience} yrs</Text>
          </View>
        </View>

        {item.verificationStatus === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.verifyBtn]}
              onPress={() => handleVerify(item)}
              disabled={actionLoading}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
              disabled={actionLoading}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  };

  // ── Main Render ─────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Management</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statValue, { color: '#a7f3d0' }]}>{stats.verified}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statValue, { color: '#fde68a' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statValue, { color: '#fecaca' }]}>{stats.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors by name or PMC..."
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <Ionicons name="close-circle" size={18} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterTab, filter === opt.key && styles.filterTabActive]}
            onPress={() => dispatch(setVerificationFilter(opt.key))}
          >
            <Text style={[styles.filterTabText, filter === opt.key && styles.filterTabTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Doctor List */}
      {loading && doctors.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item) => item.doctorId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color={COLORS.text.tertiary} />
              <Text style={styles.emptyTitle}>No doctors found</Text>
              <Text style={styles.emptyText}>
                {filter !== 'all' ? `No ${filter} doctors` : 'No doctors match your search'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  verifyBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
});

export default DoctorManagementScreen;
