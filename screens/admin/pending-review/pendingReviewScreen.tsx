import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../constants/darkShift';
import { useTheme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  getPendingProvidersAsync,
  getProviderDetailsAsync,
  approveProviderAsync,
  rejectProviderAsync,
  selectPendingProviders,
  selectSelectedProvider,
  selectPendingPagination,
  selectIsLoading,
  selectIsActionLoading,
  clearSelectedProvider,
} from '../provider-management/providerManagementSlice';
import { Provider, ProviderType } from '../../../models/admin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IconName = keyof typeof Ionicons.glyphMap;

// ============================================
// FILTER CHIP COMPONENT
// ============================================

const FilterChip = ({
  label,
  icon,
  isActive,
  count,
  onPress,
}: {
  label: string;
  icon: IconName;
  isActive: boolean;
  count?: number;
  onPress: () => void;
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);

  return (
  <TouchableOpacity
    style={[styles.filterChip, isActive && styles.filterChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={16} color={isActive ? '#FFFFFF' : '#64748b'} />
    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
    {count !== undefined && count > 0 && (
      <View style={[styles.filterChipBadge, isActive && styles.filterChipBadgeActive]}>
        <Text style={[styles.filterChipBadgeText, isActive && { color: '#6366f1' }]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
  );
};

// ============================================
// PROVIDER CARD COMPONENT
// ============================================

const ProviderCard = ({
  provider,
  index,
  onReview,
}: {
  provider: Provider;
  index: number;
  onReview: () => void;
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTypeColor = (type: ProviderType) => {
    const colors: Record<ProviderType, string> = {
      doctor: '#3b82f6',
      home_service: '#f59e0b',
      vendor: '#8b5cf6',
    };
    return colors[type];
  };

  const getTypeIcon = (type: ProviderType): IconName => {
    const icons: Record<ProviderType, IconName> = {
      doctor: 'medical',
      home_service: 'construct',
      vendor: 'storefront',
    };
    return icons[type];
  };

  const getTypeLabel = (type: ProviderType) => {
    const labels: Record<ProviderType, string> = {
      doctor: 'Doctor',
      home_service: 'Home Service',
      vendor: 'Vendor',
    };
    return labels[type];
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <Animated.View
      style={[
        styles.providerCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Status bar */}
      <View style={[styles.cardStatusBar, { backgroundColor: '#f59e0b' }]} />

      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.providerAvatar, { backgroundColor: getTypeColor(provider.providerType) + '20' }]}>
            <Text style={[styles.providerInitial, { color: getTypeColor(provider.providerType) }]}>
              {provider.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.providerInfo}>
            <View style={styles.providerNameRow}>
              <Ionicons name={getTypeIcon(provider.providerType)} size={16} color={getTypeColor(provider.providerType)} />
              <Text style={styles.providerName} numberOfLines={1}>{provider.fullName}</Text>
            </View>
            <Text style={styles.providerEmail} numberOfLines={1}>{provider.email}</Text>
            <View style={styles.providerTags}>
              <View style={[styles.typeTag, { backgroundColor: getTypeColor(provider.providerType) + '15' }]}>
                <Text style={[styles.typeTagText, { color: getTypeColor(provider.providerType) }]}>
                  {getTypeLabel(provider.providerType)}
                </Text>
              </View>
              {provider.specialty && (
                <View style={styles.subtypeTag}>
                  <Text style={styles.subtypeTagText}>{provider.specialty}</Text>
                </View>
              )}
              {provider.providerSubType && (
                <View style={styles.subtypeTag}>
                  <Text style={styles.subtypeTagText}>{provider.providerSubType}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{provider.phoneNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{provider.city}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="briefcase-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{provider.experience}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color="#94a3b8" />
            <Text style={styles.timeText}>{formatTimeAgo(provider.createdAt)}</Text>
          </View>
          <TouchableOpacity style={styles.reviewButton} onPress={onReview}>
            <Text style={styles.reviewButtonText}>Review</Text>
            <Ionicons name="arrow-forward" size={16} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================
// REVIEW MODAL COMPONENT
// ============================================

const ReviewModal = ({
  visible,
  provider,
  isLoading,
  onClose,
  onApprove,
  onReject,
}: {
  visible: boolean;
  provider: Provider | null;
  isLoading: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!provider) return null;

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    if (rejectReason.trim().length < 10) {
      Alert.alert('Too Short', 'Please provide a more detailed reason');
      return;
    }
    onReject(rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const getTypeColor = (type: ProviderType) => {
    const colors: Record<ProviderType, string> = {
      doctor: '#3b82f6',
      home_service: '#f59e0b',
      vendor: '#8b5cf6',
    };
    return colors[type];
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Review Application</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Provider Header */}
          <LinearGradient
            colors={[getTypeColor(provider.providerType), getTypeColor(provider.providerType) + 'CC']}
            style={styles.providerHeader}
          >
            <View style={styles.providerHeaderAvatar}>
              <Text style={styles.providerHeaderInitial}>{provider.fullName.charAt(0)}</Text>
            </View>
            <Text style={styles.providerHeaderName}>{provider.fullName}</Text>
            <Text style={styles.providerHeaderEmail}>{provider.email}</Text>
            <View style={styles.providerHeaderBadge}>
              <Text style={styles.providerHeaderBadgeText}>
                {provider.providerType === 'doctor' ? 'Doctor' : provider.providerType === 'home_service' ? 'Home Service' : 'Vendor'}
              </Text>
            </View>
          </LinearGradient>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="person" size={18} color="#6366f1" />
              </View>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            <View style={styles.infoCard}>
              <InfoRow icon="person-outline" label="Full Name" value={provider.fullName} />
              <InfoRow icon="mail-outline" label="Email" value={provider.email} />
              <InfoRow icon="call-outline" label="Phone" value={provider.phoneNumber} />
              <InfoRow icon="card-outline" label="ID Number" value={provider.idNumber} />
              <InfoRow icon="location-outline" label="City" value={provider.city} />
            </View>
          </View>

          {/* Professional Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="briefcase" size={18} color="#6366f1" />
              </View>
              <Text style={styles.sectionTitle}>Professional Information</Text>
            </View>
            <View style={styles.infoCard}>
              <InfoRow icon="grid-outline" label="Type" value={provider.providerType === 'doctor' ? 'Doctor' : provider.providerType === 'home_service' ? 'Home Service' : 'Vendor'} />
              {provider.specialty && <InfoRow icon="medical-outline" label="Specialty" value={provider.specialty} />}
              {provider.providerSubType && <InfoRow icon="layers-outline" label="Sub Type" value={provider.providerSubType} />}
              <InfoRow icon="time-outline" label="Experience" value={provider.experience} />
              {provider.rate && <InfoRow icon="cash-outline" label="Rate" value={`Rs. ${provider.rate}`} />}
            </View>
          </View>

          {/* Description */}
          {provider.briefDescription && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="document-text" size={18} color="#6366f1" />
                </View>
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{provider.briefDescription}</Text>
              </View>
            </View>
          )}

          {/* Documents */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="folder" size={18} color="#6366f1" />
              </View>
              <Text style={styles.sectionTitle}>Documents</Text>
            </View>
            <View style={styles.documentsGrid}>
              {provider.documents && Object.entries(provider.documents).map(([key, doc]) => {
                if (!doc) return null;
                const documentUrl = typeof doc === 'string' ? doc : doc.url;
                return (
                  <TouchableOpacity 
                    key={key} 
                    style={styles.documentCard}
                    onPress={() => {
                      if (documentUrl) {
                        Linking.openURL(documentUrl).catch(() => {
                          Alert.alert('Error', 'Unable to open document');
                        });
                      } else {
                        Alert.alert('Error', 'Document URL not available');
                      }
                    }}
                  >
                    <View style={styles.documentIcon}>
                      <Ionicons name="document-text" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.documentName} numberOfLines={2}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Text>
                    <View style={styles.documentViewBtn}>
                      <Ionicons name="eye" size={14} color="#6366f1" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setShowRejectModal(true)}
              disabled={isLoading}
            >
              <Ionicons name="close-circle" size={22} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={onApprove}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Reject Modal */}
        <Modal visible={showRejectModal} transparent animationType="fade">
          <View style={styles.rejectModalOverlay}>
            <View style={styles.rejectModalContainer}>
              <View style={styles.rejectModalIcon}>
                <Ionicons name="close-circle" size={32} color="#ef4444" />
              </View>
              <Text style={styles.rejectModalTitle}>Reject Application</Text>
              <Text style={styles.rejectModalSubtitle}>
                Please provide a reason for rejection. The provider will be notified.
              </Text>
              <TextInput
                style={styles.rejectInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g., Documents are unclear..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.quickReasons}>
                {['Invalid documents', 'Incomplete information', 'Suspicious application'].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={styles.quickReasonChip}
                    onPress={() => setRejectReason(reason)}
                  >
                    <Text style={styles.quickReasonText}>{reason}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rejectModalButtons}>
                <TouchableOpacity
                  style={[styles.rejectModalBtn, styles.cancelBtn]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectModalBtn, styles.confirmRejectBtn]}
                  onPress={handleReject}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmRejectBtnText}>Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

// Info Row Component
const InfoRow = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);

  return (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} size={16} color="#6366f1" />
      </View>
      <Text style={styles.infoRowLabel}>{label}</Text>
    </View>
    <Text style={styles.infoRowValue}>{value}</Text>
  </View>
  );
};

// ============================================
// MAIN SCREEN COMPONENT
// ============================================

const PendingReviewScreen = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const pendingProviders = useAppSelector(selectPendingProviders);
  const selectedProvider = useAppSelector(selectSelectedProvider);
  const pagination = useAppSelector(selectPendingPagination);
  const isLoading = useAppSelector(selectIsLoading);
  const isActionLoading = useAppSelector(selectIsActionLoading);

  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderType | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProviders();
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [providerTypeFilter]);

  const loadProviders = useCallback(() => {
    dispatch(getPendingProvidersAsync({
      page: 1,
      limit: 10,
      providerType: providerTypeFilter === 'all' ? undefined : providerTypeFilter,
    }));
  }, [dispatch, providerTypeFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProviders();
    setTimeout(() => setRefreshing(false), 1000);
  }, [loadProviders]);

  const handleReview = async (providerId: string) => {
    await dispatch(getProviderDetailsAsync(providerId));
    setModalVisible(true);
  };

  const handleApprove = async () => {
    if (!selectedProvider) return;

    Alert.alert(
      'Approve Provider',
      'This will grant the provider access to the platform. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await dispatch(approveProviderAsync(selectedProvider.id || selectedProvider._id!)).unwrap();
              Alert.alert('Success', 'Provider has been approved');
              setModalVisible(false);
              loadProviders();
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to approve provider');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (reason: string) => {
    if (!selectedProvider) return;

    try {
      await dispatch(rejectProviderAsync({
        providerId: selectedProvider.id || selectedProvider._id!,
        reason,
      })).unwrap();
      Alert.alert('Rejected', 'Provider application has been rejected');
      setModalVisible(false);
      loadProviders();
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to reject provider');
    }
  };

  // Count by type
  const doctorCount = pendingProviders.filter(p => p.providerType === 'doctor').length;
  const homeServiceCount = pendingProviders.filter(p => p.providerType === 'home_service').length;
  const vendorCount = pendingProviders.filter(p => p.providerType === 'vendor').length;

  const filteredProviders = providerTypeFilter === 'all'
    ? pendingProviders
    : pendingProviders.filter(p => p.providerType === providerTypeFilter);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient colors={['#d1fae5', '#a7f3d0']} style={styles.emptyIconContainer}>
        <Ionicons name="checkmark-done" size={48} color="#059669" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptySubtitle}>No pending applications to review</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={sh.n('#f8fafc', 'bg')} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Pending Reviews</Text>
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerSubtitle}>
              {pendingProviders.length} {pendingProviders.length === 1 ? 'application' : 'applications'} waiting for review
            </Text>
            {pendingProviders.length > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{pendingProviders.length}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <FilterChip
            label="All"
            icon="list"
            isActive={providerTypeFilter === 'all'}
            count={pendingProviders.length}
            onPress={() => setProviderTypeFilter('all')}
          />
          <FilterChip
            label="Doctors"
            icon="medical"
            isActive={providerTypeFilter === 'doctor'}
            count={doctorCount}
            onPress={() => setProviderTypeFilter('doctor')}
          />
          <FilterChip
            label="Home Services"
            icon="construct"
            isActive={providerTypeFilter === 'home_service'}
            count={homeServiceCount}
            onPress={() => setProviderTypeFilter('home_service')}
          />
          <FilterChip
            label="Vendors"
            icon="storefront"
            isActive={providerTypeFilter === 'vendor'}
            count={vendorCount}
            onPress={() => setProviderTypeFilter('vendor')}
          />
        </ScrollView>
      </View>

      {/* List */}
      {isLoading && pendingProviders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id || item._id || Math.random().toString()}
          renderItem={({ item, index }) => (
            <ProviderCard
              provider={item}
              index={index}
              onReview={() => handleReview(item.id || item._id!)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366f1']} />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Review Modal */}
      <ReviewModal
        visible={modalVisible}
        provider={selectedProvider}
        isLoading={isActionLoading}
        onClose={() => {
          setModalVisible(false);
          dispatch(clearSelectedProvider());
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sh.n('#f8fafc', 'surfaceSunken'),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderBottomWidth: 1,
    borderBottomColor: sh.n('#e2e8f0', 'line'),
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: sh.hue('#6366F1'),
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: sh.n('#64748b', 'inkMuted'),
    fontWeight: '500',
  },
  headerBadge: {
    backgroundColor: sh.hue('#ef4444'),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Filters
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderBottomWidth: 1,
    borderBottomColor: sh.n('#e2e8f0', 'line'),
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: sh.n('#e2e8f0', 'line'),
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: sh.hue('#6366f1'),
    borderColor: sh.hue('#6366f1'),
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: sh.n('#64748b', 'inkMuted'),
  },
  filterChipTextActive: {
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
  filterChipBadge: {
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: sh.n('#64748b', 'inkMuted'),
  },

  // Provider Card
  providerCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardStatusBar: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: sh.n('#1e293b', 'ink'),
  },
  providerEmail: {
    fontSize: 13,
    color: sh.n('#64748b', 'inkMuted'),
    marginBottom: 8,
  },
  providerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtypeTag: {
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subtypeTagText: {
    fontSize: 11,
    color: sh.n('#64748b', 'inkMuted'),
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: sh.ground('#fef3c7', '#F59E0B'),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: sh.hue('#f59e0b'),
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: sh.hue('#d97706'),
  },
  cardDetails: {
    marginTop: 16,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: sh.n('#475569', 'inkMuted'),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: sh.n('#f1f5f9', 'lineSoft'),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: sh.n('#94a3b8', 'inkFaint'),
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: sh.hue('#6366f1'),
  },

  // List
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: sh.n('#64748b', 'inkMuted'),
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: sh.n('#1e293b', 'ink'),
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: sh.n('#64748b', 'inkMuted'),
    textAlign: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: sh.n('#f8fafc', 'surfaceSunken'),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderBottomWidth: 1,
    borderBottomColor: sh.n('#e2e8f0', 'line'),
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: sh.n('#1e293b', 'ink'),
  },
  modalContent: {
    flex: 1,
  },
  providerHeader: {
    padding: 24,
    alignItems: 'center',
    margin: 16,
    borderRadius: 20,
  },
  providerHeaderAvatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerHeaderInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
  providerHeaderName: {
    fontSize: 22,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
    marginBottom: 4,
  },
  providerHeaderEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  providerHeaderBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  providerHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: sh.ground('#eff6ff', '#3B82F6'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: sh.n('#1e293b', 'ink'),
  },
  infoCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: sh.n('#f8fafc', 'surfaceSunken'),
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRowLabel: {
    fontSize: 13,
    color: sh.n('#64748b', 'inkMuted'),
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: sh.n('#1e293b', 'ink'),
    maxWidth: '50%',
    textAlign: 'right',
  },
  descriptionCard: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  descriptionText: {
    fontSize: 14,
    color: sh.n('#475569', 'inkMuted'),
    lineHeight: 22,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: sh.ground('#eff6ff', '#3B82F6'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  documentName: {
    fontSize: 12,
    fontWeight: '600',
    color: sh.n('#1e293b', 'ink'),
    textAlign: 'center',
    marginBottom: 8,
  },
  documentViewBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  rejectBtn: {
    backgroundColor: sh.hue('#ef4444'),
  },
  approveBtn: {
    backgroundColor: sh.hue('#10b981'),
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },

  // Reject Modal
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  rejectModalContainer: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  rejectModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: sh.ground('#fee2e2', '#EF4444'),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: sh.n('#1e293b', 'ink'),
    textAlign: 'center',
    marginBottom: 8,
  },
  rejectModalSubtitle: {
    fontSize: 14,
    color: sh.n('#64748b', 'inkMuted'),
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rejectInput: {
    backgroundColor: sh.n('#f8fafc', 'surfaceSunken'),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: sh.n('#e2e8f0', 'line'),
    padding: 16,
    fontSize: 14,
    color: sh.n('#1e293b', 'ink'),
    minHeight: 100,
    marginBottom: 16,
  },
  quickReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  quickReasonChip: {
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickReasonText: {
    fontSize: 12,
    color: sh.n('#475569', 'inkMuted'),
    fontWeight: '500',
  },
  rejectModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: sh.n('#f1f5f9', 'lineSoft'),
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: sh.n('#475569', 'inkMuted'),
  },
  confirmRejectBtn: {
    backgroundColor: sh.hue('#ef4444'),
  },
  confirmRejectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
  },
});

export default PendingReviewScreen;