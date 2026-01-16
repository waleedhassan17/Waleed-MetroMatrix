import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  getAllProvidersAsync,
  getProviderDetailsAsync,
  activateProviderAsync,
  deactivateProviderAsync,
  deleteProviderAsync,
  selectAllProviders,
  selectPagination,
  selectIsLoading,
  selectIsActionLoading,
  selectSelectedProvider,
  setFilters,
  clearSelectedProvider,
} from './providerManagementSlice';
import {
  Provider,
  ProviderType,
  VerificationStatus,
  PROVIDER_TYPE_CONFIG,
  VERIFICATION_STATUS_CONFIG,
} from '../../../models/admin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IconName = keyof typeof Ionicons.glyphMap;

// Filter Chip Component
const FilterChip = ({
  label,
  icon,
  isActive,
  count,
  onPress,
  color = '#6366f1',
}: {
  label: string;
  icon?: IconName;
  isActive: boolean;
  count?: number;
  onPress: () => void;
  color?: string;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          isActive && { backgroundColor: color, borderColor: color },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={isActive ? '#FFFFFF' : color}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label}
        </Text>
        {count !== undefined && (
          <View style={[styles.filterChipBadge, isActive && styles.filterChipBadgeActive]}>
            <Text style={[styles.filterChipBadgeText, isActive && { color: color }]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Stats Summary Component
const StatsSummary = ({
  total,
  doctors,
  homeServices,
  vendors,
}: {
  total: number;
  doctors: number;
  homeServices: number;
  vendors: number;
}) => (
  <View style={styles.statsContainer}>
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{total}</Text>
      <Text style={styles.statLabel}>Total</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: '#3b82f6' }]}>{doctors}</Text>
      <Text style={styles.statLabel}>Doctors</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: '#f59e0b' }]}>{homeServices}</Text>
      <Text style={styles.statLabel}>Services</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{vendors}</Text>
      <Text style={styles.statLabel}>Vendors</Text>
    </View>
  </View>
);

// Provider Card Component
const ProviderCard = ({
  provider,
  index,
  onPress,
  onToggleStatus,
  onDelete,
  isActionLoading,
}: {
  provider: Provider;
  index: number;
  onPress: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isActionLoading: boolean;
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const typeColor = PROVIDER_TYPE_CONFIG[provider.providerType]?.color || '#6366f1';
  const typeIcon = (PROVIDER_TYPE_CONFIG[provider.providerType]?.icon as IconName) || 'person';
  const typeLabel = PROVIDER_TYPE_CONFIG[provider.providerType]?.label || 'Provider';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Animated.View
      style={[
        styles.providerCard,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity style={styles.providerCardContent} onPress={onPress} activeOpacity={0.7}>
        {/* Status Bar */}
        <View style={[styles.cardStatusBar, { backgroundColor: provider.isActive ? '#10b981' : '#ef4444' }]} />

        {/* Header Row */}
        <View style={styles.providerHeader}>
          {/* Avatar */}
          <LinearGradient
            colors={[typeColor, `${typeColor}99`]}
            style={styles.providerAvatar}
          >
            <Text style={styles.providerAvatarText}>{getInitials(provider.fullName)}</Text>
          </LinearGradient>

          {/* Info */}
          <View style={styles.providerInfo}>
            <View style={styles.providerNameRow}>
              <Text style={styles.providerName} numberOfLines={1}>{provider.fullName}</Text>
              {provider.emailVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              )}
            </View>
            <Text style={styles.providerEmail} numberOfLines={1}>{provider.email}</Text>
            <View style={styles.providerTagsRow}>
              <View style={[styles.providerTag, { backgroundColor: `${typeColor}15` }]}>
                <Ionicons name={typeIcon} size={12} color={typeColor} />
                <Text style={[styles.providerTagText, { color: typeColor }]}>{typeLabel}</Text>
              </View>
              {provider.specialty && (
                <View style={[styles.providerTag, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={styles.providerTagText}>{provider.specialty}</Text>
                </View>
              )}
              {provider.providerSubType && (
                <View style={[styles.providerTag, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={styles.providerTagText}>
                    {provider.providerSubType.replace('_', ' ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Rating Badge */}
          {provider.ratings && provider.ratings.average > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>{provider.ratings.average.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Details Row */}
        <View style={styles.providerDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{provider.phoneNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{provider.city || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="briefcase-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{provider.experience || 'N/A'}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.providerFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.joinedText}>Joined {formatDate(provider.createdAt)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: provider.isActive ? '#ecfdf5' : '#fef2f2' }]}>
              <View style={[styles.statusDot, { backgroundColor: provider.isActive ? '#10b981' : '#ef4444' }]} />
              <Text style={[styles.statusText, { color: provider.isActive ? '#10b981' : '#ef4444' }]}>
                {provider.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: provider.isActive ? '#fef2f2' : '#ecfdf5' }]}
              onPress={onToggleStatus}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={provider.isActive ? '#ef4444' : '#10b981'} />
              ) : (
                <Ionicons
                  name={provider.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={20}
                  color={provider.isActive ? '#ef4444' : '#10b981'}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Provider Detail Modal
const ProviderDetailModal = ({
  visible,
  provider,
  onClose,
  onToggleStatus,
  onDelete,
  isActionLoading,
}: {
  visible: boolean;
  provider: Provider | null;
  onClose: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isActionLoading: boolean;
}) => {
  if (!provider) return null;

  const typeColor = PROVIDER_TYPE_CONFIG[provider.providerType]?.color || '#6366f1';
  const typeIcon = (PROVIDER_TYPE_CONFIG[provider.providerType]?.icon as IconName) || 'person';
  const typeLabel = PROVIDER_TYPE_CONFIG[provider.providerType]?.label || 'Provider';

  const InfoRow = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
    <View style={styles.modalInfoRow}>
      <View style={styles.modalInfoIcon}>
        <Ionicons name={icon} size={18} color="#6366f1" />
      </View>
      <View style={styles.modalInfoContent}>
        <Text style={styles.modalInfoLabel}>{label}</Text>
        <Text style={styles.modalInfoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <LinearGradient colors={[typeColor, `${typeColor}cc`]} style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modalHeaderContent}>
            <View style={styles.modalAvatar}>
              <Ionicons name={typeIcon} size={32} color={typeColor} />
            </View>
            <Text style={styles.modalName}>{provider.fullName}</Text>
            <Text style={styles.modalType}>{typeLabel}</Text>
            <View style={styles.modalStatusRow}>
              <View style={[styles.modalStatusBadge, { backgroundColor: provider.isActive ? '#10b981' : '#ef4444' }]}>
                <Text style={styles.modalStatusText}>{provider.isActive ? 'Active' : 'Inactive'}</Text>
              </View>
              {provider.ratings && provider.ratings.average > 0 && (
                <View style={styles.modalRatingBadge}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.modalRatingText}>
                    {provider.ratings.average.toFixed(1)} ({provider.ratings.count} reviews)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Contact Information */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Contact Information</Text>
            <View style={styles.modalCard}>
              <InfoRow icon="mail-outline" label="Email" value={provider.email} />
              <InfoRow icon="call-outline" label="Phone" value={provider.phoneNumber} />
              <InfoRow icon="location-outline" label="City" value={provider.city} />
              {provider.address && <InfoRow icon="home-outline" label="Address" value={provider.address} />}
            </View>
          </View>

          {/* Professional Information */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Professional Information</Text>
            <View style={styles.modalCard}>
              <InfoRow icon="briefcase-outline" label="Experience" value={provider.experience} />
              {provider.specialty && <InfoRow icon="medical-outline" label="Specialty" value={provider.specialty} />}
              {provider.providerSubType && (
                <InfoRow icon="construct-outline" label="Service Type" value={provider.providerSubType.replace('_', ' ')} />
              )}
              {provider.rate && <InfoRow icon="cash-outline" label="Rate" value={provider.rate} />}
              {provider.consultationFee && (
                <InfoRow icon="wallet-outline" label="Consultation Fee" value={`PKR ${provider.consultationFee}`} />
              )}
              <InfoRow icon="card-outline" label="ID Number" value={provider.idNumber} />
            </View>
          </View>

          {/* Description */}
          {provider.briefDescription && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Description</Text>
              <View style={styles.modalCard}>
                <Text style={styles.descriptionText}>{provider.briefDescription}</Text>
              </View>
            </View>
          )}

          {/* Documents */}
          {provider.documents && Object.keys(provider.documents).length > 0 && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Documents</Text>
              <View style={styles.documentsGrid}>
                {Object.entries(provider.documents).map(([key, doc]) => {
                  if (!doc) return null;
                  return (
                    <TouchableOpacity key={key} style={styles.documentItem}>
                      <View style={styles.documentIcon}>
                        <Ionicons name="document-text" size={24} color="#6366f1" />
                        {doc.verified && (
                          <View style={styles.documentVerified}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: provider.isActive ? '#fef2f2' : '#ecfdf5' }]}
              onPress={onToggleStatus}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator color={provider.isActive ? '#ef4444' : '#10b981'} />
              ) : (
                <>
                  <Ionicons
                    name={provider.isActive ? 'pause-circle' : 'play-circle'}
                    size={22}
                    color={provider.isActive ? '#ef4444' : '#10b981'}
                  />
                  <Text style={[styles.modalActionText, { color: provider.isActive ? '#ef4444' : '#10b981' }]}>
                    {provider.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#fef2f2' }]}
              onPress={onDelete}
            >
              <Ionicons name="trash" size={22} color="#ef4444" />
              <Text style={[styles.modalActionText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Main Screen Component
const ProviderManagementScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const providers = useAppSelector(selectAllProviders);
  const pagination = useAppSelector(selectPagination);
  const isLoading = useAppSelector(selectIsLoading);
  const isActionLoading = useAppSelector(selectIsActionLoading);
  const selectedProvider = useAppSelector(selectSelectedProvider);

  const [search, setSearch] = useState('');
  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProviders();
  }, [providerTypeFilter, statusFilter]);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      loadProviders();
    }, 500);
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [search]);

  const loadProviders = useCallback(() => {
    const filters: any = {
      status: 'approved', // Only show approved providers
      page: 1,
      limit: 15,
    };
    if (search) filters.search = search;
    if (providerTypeFilter !== 'all') filters.providerType = providerTypeFilter;
    if (statusFilter === 'active') filters.isActive = true;
    if (statusFilter === 'inactive') filters.isActive = false;

    dispatch(getAllProvidersAsync(filters));
  }, [dispatch, search, providerTypeFilter, statusFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProviders();
    setTimeout(() => setRefreshing(false), 1000);
  }, [loadProviders]);

  const handleProviderPress = async (provider: Provider) => {
    await dispatch(getProviderDetailsAsync(provider._id || provider.id));
    setModalVisible(true);
  };

  const handleToggleStatus = async (provider: Provider) => {
    const providerId = provider._id || provider.id;
    const action = provider.isActive ? 'deactivate' : 'activate';

    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Provider`,
      `Are you sure you want to ${action} ${provider.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: provider.isActive ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoadingId(providerId);
            try {
              if (provider.isActive) {
                await dispatch(deactivateProviderAsync(providerId)).unwrap();
                Alert.alert('Success', 'Provider deactivated successfully');
              } else {
                await dispatch(activateProviderAsync(providerId)).unwrap();
                Alert.alert('Success', 'Provider activated successfully');
              }
              loadProviders();
            } catch (error: any) {
              Alert.alert('Error', error || `Failed to ${action} provider`);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (provider: Provider) => {
    const providerId = provider._id || provider.id;

    Alert.alert(
      'Delete Provider',
      `Are you sure you want to permanently delete ${provider.fullName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProviderAsync(providerId)).unwrap();
              setModalVisible(false);
              dispatch(clearSelectedProvider());
              Alert.alert('Success', 'Provider deleted successfully');
              loadProviders();
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to delete provider');
            }
          },
        },
      ]
    );
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
    dispatch(getAllProvidersAsync({ page: newPage, limit: 15, status: 'approved' }));
  };

  // Calculate stats
  const stats = {
    total: providers.length,
    doctors: providers.filter((p) => p.providerType === 'doctor').length,
    homeServices: providers.filter((p) => p.providerType === 'home_service').length,
    vendors: providers.filter((p) => p.providerType === 'vendor').length,
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient colors={['#f1f5f9', '#e2e8f0']} style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={48} color="#94a3b8" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Providers Found</Text>
      <Text style={styles.emptySubtitle}>
        {search ? 'Try adjusting your search or filters' : 'No approved providers yet'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      {/* Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Provider Management</Text>
            <Text style={styles.headerSubtitle}>{pagination?.total || 0} approved providers</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search providers..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersSection}>
        {/* Provider Type Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <FilterChip
            label="All"
            icon="grid-outline"
            isActive={providerTypeFilter === 'all'}
            count={stats.total}
            onPress={() => setProviderTypeFilter('all')}
          />
          <FilterChip
            label="Doctors"
            icon="medical-outline"
            isActive={providerTypeFilter === 'doctor'}
            count={stats.doctors}
            onPress={() => setProviderTypeFilter('doctor')}
            color="#3b82f6"
          />
          <FilterChip
            label="Services"
            icon="construct-outline"
            isActive={providerTypeFilter === 'home_service'}
            count={stats.homeServices}
            onPress={() => setProviderTypeFilter('home_service')}
            color="#f59e0b"
          />
          <FilterChip
            label="Vendors"
            icon="storefront-outline"
            isActive={providerTypeFilter === 'vendor'}
            count={stats.vendors}
            onPress={() => setProviderTypeFilter('vendor')}
            color="#8b5cf6"
          />
        </ScrollView>

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <FilterChip
            label="All Status"
            isActive={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
          />
          <FilterChip
            label="Active"
            isActive={statusFilter === 'active'}
            onPress={() => setStatusFilter('active')}
            color="#10b981"
          />
          <FilterChip
            label="Inactive"
            isActive={statusFilter === 'inactive'}
            onPress={() => setStatusFilter('inactive')}
            color="#ef4444"
          />
        </ScrollView>
      </View>

      {/* Stats Summary */}
      <StatsSummary
        total={stats.total}
        doctors={stats.doctors}
        homeServices={stats.homeServices}
        vendors={stats.vendors}
      />

      {/* Provider List */}
      {isLoading && providers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item, index }) => (
            <ProviderCard
              provider={item}
              index={index}
              onPress={() => handleProviderPress(item)}
              onToggleStatus={() => handleToggleStatus(item)}
              onDelete={() => handleDelete(item)}
              isActionLoading={actionLoadingId === (item._id || item.id)}
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

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, pagination.page <= 1 && styles.pageBtnDisabled]}
            disabled={pagination.page <= 1}
            onPress={() => handlePageChange(pagination.page - 1)}
          >
            <Ionicons name="chevron-back" size={20} color={pagination.page <= 1 ? '#cbd5e1' : '#6366f1'} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Page {pagination.page} of {pagination.pages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, pagination.page >= pagination.pages && styles.pageBtnDisabled]}
            disabled={pagination.page >= pagination.pages}
            onPress={() => handlePageChange(pagination.page + 1)}
          >
            <Ionicons name="chevron-forward" size={20} color={pagination.page >= pagination.pages ? '#cbd5e1' : '#6366f1'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        visible={modalVisible}
        provider={selectedProvider}
        onClose={() => {
          setModalVisible(false);
          dispatch(clearSelectedProvider());
        }}
        onToggleStatus={() => selectedProvider && handleToggleStatus(selectedProvider)}
        onDelete={() => selectedProvider && handleDelete(selectedProvider)}
        isActionLoading={isActionLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    marginLeft: 10,
  },
  filtersSection: {
    paddingTop: 12,
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipBadge: {
    marginLeft: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#f1f5f9',
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  providerCardContent: {
    padding: 16,
  },
  cardStatusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  providerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  providerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  providerEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  providerTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  providerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  providerTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  providerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  providerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinedText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#FFFFFF',
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
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
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  modalHeaderContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  modalRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  modalInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalInfoContent: {
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentItem: {
    width: (SCREEN_WIDTH - 72) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentVerified: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  documentName: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProviderManagementScreen;