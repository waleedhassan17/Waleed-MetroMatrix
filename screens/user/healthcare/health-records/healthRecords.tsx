import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  TextInput,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchRecords,
  setSelectedCategory,
  deleteRecord,
  selectFilteredRecords,
  selectRecordStats,
  RECORD_CATEGORIES,
  RecordCategory,
} from './healthRecordsSlice';
import type { MedicalRecord } from '../../../../models/healthcare/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Theme Colors ────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'],
    header: ['#1857C0', '#1E6AE1'],
    accent: ['#5A9FFF', '#2A7FFF'],
  },
};

// ── Category Configuration ──────────────────

const CATEGORY_CONFIG: Record<string, {
  icon: string;
  color: string;
  gradient: string[];
  bgColor: string;
}> = {
  All: {
    icon: 'folder-multiple-outline',
    color: '#1857C0',
    gradient: ['#1857C0', '#5A9FFF'],
    bgColor: '#EAF3FF',
  },
  Prescriptions: {
    icon: 'prescription',
    color: '#2A7FFF',
    gradient: ['#2A7FFF', '#1E6AE1'],
    bgColor: '#F0F7FF',
  },
  'Lab Reports': {
    icon: 'flask-outline',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    bgColor: '#ECFDF5',
  },
  Imaging: {
    icon: 'image-filter-center-focus',
    color: '#5A9FFF',
    gradient: ['#5A9FFF', '#1E6AE1'],
    bgColor: '#EAF3FF',
  },
  Vaccination: {
    icon: 'needle',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    bgColor: '#FFFBEB',
  },
  Other: {
    icon: 'folder-open-outline',
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563'],
    bgColor: '#F3F4F6',
  },
};

const RECORD_TYPE_CONFIG: Record<string, {
  icon: string;
  color: string;
  label: string;
}> = {
  prescription: { icon: 'prescription', color: '#2A7FFF', label: 'Prescription' },
  report: { icon: 'flask-outline', color: '#10B981', label: 'Lab Report' },
  imaging: { icon: 'image-filter-center-focus', color: '#5A9FFF', label: 'Imaging' },
  discharge: { icon: 'clipboard-check-outline', color: '#F59E0B', label: 'Discharge' },
  vaccination: { icon: 'needle', color: '#2A7FFF', label: 'Vaccination' },
  other: { icon: 'folder-open-outline', color: '#6B7280', label: 'Other' },
};

const getRecordConfig = (type: string) =>
  RECORD_TYPE_CONFIG[type] ?? RECORD_TYPE_CONFIG.other;

const getCategoryConfig = (category: string) =>
  CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.All;

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
        { width, height, borderRadius, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  );
};

const RecordCardSkeleton: React.FC = () => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineTrack}>
      <SkeletonBox width={36} height={36} borderRadius={12} />
      <View style={[styles.timelineLine, { backgroundColor: '#E5E7EB' }]} />
    </View>
    <View style={[styles.recordCard, { padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBox width={80} height={20} borderRadius={10} />
        <SkeletonBox width={50} height={16} />
      </View>
      <SkeletonBox width="80%" height={18} style={{ marginTop: 12 }} />
      <SkeletonBox width="60%" height={14} style={{ marginTop: 8 }} />
    </View>
  </View>
);

// ── Stats Card Component ────────────────────

const StatsCard: React.FC<{
  stats: { total: number; prescriptions: number; reports: number; imaging: number };
}> = ({ stats }) => {
  const statItems = [
    { label: 'Total', value: stats.total, icon: 'folder-multiple', color: '#1857C0' },
    { label: 'Prescriptions', value: stats.prescriptions, icon: 'prescription', color: '#2A7FFF' },
    { label: 'Lab Reports', value: stats.reports, icon: 'flask-outline', color: '#10B981' },
    { label: 'Imaging', value: stats.imaging, icon: 'image-filter-center-focus', color: '#5A9FFF' },
  ];

  return (
    <View style={styles.statsContainer}>
      {statItems.map((item, index) => (
        <View key={item.label} style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: item.color + '15' }]}>
            <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
          </View>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

// ── Main Component ──────────────────────────

const HealthRecordsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;

  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const { selectedCategory, loading, error } = useAppSelector((state) => state.healthRecords);
  const filteredRecords = useAppSelector(selectFilteredRecords);
  const stats = useAppSelector(selectRecordStats);

  // Filter by search
  const displayedRecords = useMemo(() => {
    if (!searchText.trim()) return filteredRecords;
    const query = searchText.toLowerCase();
    return filteredRecords.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
    );
  }, [filteredRecords, searchText]);

  useEffect(() => {
    dispatch(fetchRecords());

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchRecords());
    setRefreshing(false);
  }, [dispatch]);

  const handleDelete = useCallback(
    (recordId: string, title: string) => {
      Alert.alert(
        'Delete Record',
        `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => dispatch(deleteRecord(recordId)),
          },
        ]
      );
    },
    [dispatch]
  );

  // ── Format helpers ────────────────────────

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDate(iso);
  };

  // ── Group records by month ────────────────

  const groupByMonth = (records: MedicalRecord[]) => {
    const groups: { month: string; data: MedicalRecord[] }[] = [];
    const map = new Map<string, MedicalRecord[]>();

    for (const rec of records) {
      const d = new Date(rec.uploadedAt);
      const key = d.toLocaleDateString('en-PK', {
        month: 'long',
        year: 'numeric',
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rec);
    }

    map.forEach((data, month) => groups.push({ month, data }));
    return groups;
  };

  const groupedRecords = groupByMonth(displayedRecords);

  // ── Render: Category Tab ──────────────────

  const renderCategoryTab = useCallback(
    ({ item: category }: { item: RecordCategory }) => {
      const isActive = selectedCategory === category;
      const config = getCategoryConfig(category);

      return (
        <TouchableOpacity
          style={[styles.categoryTab, isActive && styles.categoryTabActive]}
          onPress={() => dispatch(setSelectedCategory(category))}
          activeOpacity={0.7}
        >
          {isActive ? (
            <LinearGradient
              colors={config.gradient as any}
              style={styles.categoryTabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons
                name={config.icon as any}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.categoryTabTextActive}>{category}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.categoryTabInner}>
              <MaterialCommunityIcons
                name={config.icon as any}
                size={16}
                color={Colors.text.secondary}
              />
              <Text style={styles.categoryTabText}>{category}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedCategory, dispatch]
  );

  // ── Render: Record Card (Enhanced Timeline) ─

  const renderRecordCard = useCallback(
    (record: MedicalRecord, isLast: boolean, index: number) => {
      const config = getRecordConfig(record.type);

      return (
        <Animated.View
          key={record.recordId}
          style={[
            styles.timelineRow,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Timeline Track */}
          <View style={styles.timelineTrack}>
            <LinearGradient
              colors={[config.color, config.color + 'CC']}
              style={styles.timelineDot}
            >
              <MaterialCommunityIcons
                name={config.icon as any}
                size={16}
                color="#FFFFFF"
              />
            </LinearGradient>
            {!isLast && <View style={styles.timelineLine} />}
          </View>

          {/* Card */}
          <TouchableOpacity
            style={styles.recordCard}
            activeOpacity={0.8}
            onPress={() => {
              if (record.type === 'prescription') {
                navigation.navigate('PrescriptionView', {
                  prescriptionId: record.recordId,
                });
              } else {
                navigation.navigate('RecordDetail', {
                  recordId: record.recordId,
                });
              }
            }}
            onLongPress={() => handleDelete(record.recordId, record.title)}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View
                style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}
              >
                <Text style={[styles.typeBadgeText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <Text style={styles.cardTime}>{getRelativeDate(record.uploadedAt)}</Text>
            </View>

            {/* Card Content */}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {record.title}
            </Text>

            {record.description && (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {record.description}
              </Text>
            )}

            {/* Card Footer */}
            <View style={styles.cardFooter}>
              {record.linkedAppointmentId && (
                <View style={styles.linkedBadge}>
                  <Ionicons name="link-outline" size={12} color={THEME.primary} />
                  <Text style={styles.linkedText}>Linked</Text>
                </View>
              )}

              {record.fileSize && (
                <View style={styles.fileSizeBadge}>
                  <Ionicons name="document-outline" size={12} color={Colors.text.tertiary} />
                  <Text style={styles.fileSizeText}>{record.fileSize}</Text>
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => {
                    // Share record
                  }}
                >
                  <Ionicons name="share-outline" size={16} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => {
                    // Download record
                  }}
                >
                  <Ionicons name="download-outline" size={16} color={Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => handleDelete(record.recordId, record.title)}
                >
                  <Ionicons name="trash-outline" size={16} color={THEME.error} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [fadeAnim, handleDelete, navigation]
  );

  // ── Render: Month Group ───────────────────

  const renderMonthGroup = useCallback(
    ({ item }: { item: { month: string; data: MedicalRecord[] } }) => (
      <View style={styles.monthGroup}>
        <View style={styles.monthHeader}>
          <View style={styles.monthBadge}>
            <Ionicons name="calendar-outline" size={14} color={THEME.primary} />
            <Text style={styles.monthText}>{item.month}</Text>
          </View>
          <Text style={styles.monthCount}>
            {item.data.length} {item.data.length === 1 ? 'record' : 'records'}
          </Text>
        </View>
        {item.data.map((rec, idx) =>
          renderRecordCard(rec, idx === item.data.length - 1, idx)
        )}
      </View>
    ),
    [renderRecordCard]
  );

  // ── Render: Empty State ───────────────────

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={['#F1F5F9', '#E2E8F0']}
          style={styles.emptyIconContainer}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={48}
            color="#94A3B8"
          />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Records Found</Text>
        <Text style={styles.emptyDescription}>
          {searchText
            ? `No results for "${searchText}"`
            : selectedCategory === 'All'
            ? 'Upload your first health record to keep track of your medical history.'
            : `No ${selectedCategory.toLowerCase()} records yet.`}
        </Text>
        {!searchText && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('UploadRecord')}
          >
            <LinearGradient
              colors={THEME.gradient.primary as any}
              style={styles.emptyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Upload Record</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Render: Upload Options Modal ──────────

  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUploadModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowUploadModal(false)}
      >
        <Animated.View style={styles.uploadOptionsContainer}>
          <View style={styles.uploadOptionsHeader}>
            <Text style={styles.uploadOptionsTitle}>Upload Record</Text>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.uploadOptionsGrid}>
            {[
              { icon: 'camera', label: 'Camera', color: '#2A7FFF' },
              { icon: 'image', label: 'Gallery', color: '#10B981' },
              { icon: 'document', label: 'Document', color: '#5A9FFF' },
              { icon: 'cloud-upload', label: 'Cloud', color: '#F59E0B' },
            ].map((option) => (
              <TouchableOpacity
                key={option.label}
                style={styles.uploadOption}
                onPress={() => {
                  setShowUploadModal(false);
                  navigation.navigate('UploadRecord', { source: option.label.toLowerCase() });
                }}
              >
                <View
                  style={[styles.uploadOptionIcon, { backgroundColor: option.color + '15' }]}
                >
                  <Ionicons name={option.icon as any} size={24} color={option.color} />
                </View>
                <Text style={styles.uploadOptionLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  // Header animation
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 120],
    extrapolate: 'clamp',
  });

  // ── Main Render ───────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E6AE1" />

      {/* Animated Header */}
      <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
        <LinearGradient
          colors={THEME.gradient.header as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Header Content */}
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              {isInTab ? <View style={styles.backButton} /> : (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>)}
              <Text style={styles.headerTitle}>Health Records</Text>
              <TouchableOpacity style={styles.headerAction}>
                <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
              <View
                style={[
                  styles.searchContainer,
                  searchFocused && styles.searchContainerFocused,
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={searchFocused ? THEME.primary : 'rgba(255,255,255,0.6)'}
                />
                <TextInput
                  style={[
                    styles.searchInput,
                    searchFocused && styles.searchInputFocused,
                  ]}
                  placeholder="Search records..."
                  placeholderTextColor={
                    searchFocused ? Colors.text.tertiary : 'rgba(255,255,255,0.5)'
                  }
                  value={searchText}
                  onChangeText={setSearchText}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={searchFocused ? Colors.text.tertiary : 'rgba(255,255,255,0.6)'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Stats Section */}
        <StatsCard stats={stats} />

        {/* Category Filter Tabs */}
        <View style={styles.categoryWrapper}>
          <FlatList
            data={RECORD_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
            keyExtractor={(item) => item}
            renderItem={renderCategoryTab}
          />
        </View>

        {/* Records Timeline */}
        {loading && !refreshing ? (
          <View style={styles.skeletonContainer}>
            <RecordCardSkeleton />
            <RecordCardSkeleton />
            <RecordCardSkeleton />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <LinearGradient
              colors={['#FEE2E2', '#FECACA']}
              style={styles.errorIconContainer}
            >
              <Ionicons name="cloud-offline-outline" size={40} color="#EF4444" />
            </LinearGradient>
            <Text style={styles.errorTitle}>Couldn't Load Records</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => dispatch(fetchRecords())}
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
        ) : (
          <FlatList
            data={groupedRecords}
            renderItem={renderMonthGroup}
            keyExtractor={(item) => item.month}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
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
              />
            }
          />
        )}
      </Animated.View>

      {/* FAB – Upload New Record */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [
              {
                scale: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => setShowUploadModal(true)}
        >
          <LinearGradient
            colors={THEME.gradient.primary as any}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Upload Options Modal */}
      {renderUploadModal()}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
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
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchWrapper: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchContainerFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  searchInputFocused: {
    color: Colors.text.primary,
  },

  // Content
  contentContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#F8FBFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
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

  // Category Tabs
  categoryWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryTabActive: {},
  categoryTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  categoryTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    gap: 6,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  categoryTabTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Loading / Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
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
  emptyDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Timeline List
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  monthGroup: {
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  monthCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },

  // Timeline Row
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineTrack: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: -4,
    borderRadius: 1,
  },

  // Record Card
  recordCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginLeft: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTime: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  linkedText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.primary,
  },
  fileSizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileSizeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  cardActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fab: {
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Upload Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  uploadOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  uploadOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  uploadOptionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  uploadOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadOption: {
    alignItems: 'center',
    flex: 1,
  },
  uploadOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
});

export default HealthRecordsScreen;