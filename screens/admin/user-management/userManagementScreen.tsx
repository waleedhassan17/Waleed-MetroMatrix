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
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  getAllUsersAsync,
  deactivateUserAsync,
  activateUserAsync,
  selectUsers,
  selectPagination,
  selectIsLoading,
  selectStats,
  setSelectedUser,
  clearSelectedUser,
} from './userManagementSlice';
import { selectAccessToken } from '../admin-dashboard/adminSlice';
import { User } from '../../../models/admin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IconName = keyof typeof Ionicons.glyphMap;
type FilterStatus = 'all' | 'active' | 'inactive';

// ============================================
// FILTER CHIP COMPONENT
// ============================================

const FilterChip = ({
  label,
  isActive,
  onPress,
  count,
  color = '#6366f1',
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
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
        {isActive && (
          <View style={[styles.filterDot, { backgroundColor: color === '#10b981' ? '#34d399' : color === '#ef4444' ? '#f87171' : '#FFFFFF' }]} />
        )}
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label}
        </Text>
        {count !== undefined && (
          <View style={[styles.filterChipBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={[styles.filterChipBadgeText, isActive && { color: '#fff' }]}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================
// STATS SUMMARY COMPONENT
// ============================================

const StatsSummary = ({ total, active, inactive }: { total: number; active: number; inactive: number }) => (
  <View style={styles.statsSummary}>
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>Total</Text>
      <Text style={styles.statValue}>{total}</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>Active</Text>
      <Text style={[styles.statValue, { color: '#10b981' }]}>{active}</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>Inactive</Text>
      <Text style={[styles.statValue, { color: '#ef4444' }]}>{inactive}</Text>
    </View>
  </View>
);

// ============================================
// USER CARD COMPONENT
// ============================================

const UserCard = ({
  user,
  index,
  onToggleStatus,
  isLoading,
}: {
  user: User;
  index: number;
  onToggleStatus: () => void;
  isLoading: boolean;
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
        styles.userCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Status indicator bar */}
      <View style={[styles.userStatusBar, { backgroundColor: user.isActive ? '#10b981' : '#ef4444' }]} />

      <View style={styles.userCardContent}>
        {/* User Avatar */}
        <View style={styles.userAvatarContainer}>
          <LinearGradient
            colors={user.isActive ? ['#6366f1', '#8b5cf6'] : ['#9ca3af', '#6b7280']}
            style={styles.userAvatarGradient}
          >
            <Text style={styles.userAvatarText}>{getInitials(user.fullName)}</Text>
          </LinearGradient>
          <View style={[styles.onlineIndicator, { backgroundColor: user.isActive ? '#10b981' : '#ef4444' }]} />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>{user.fullName}</Text>
            {user.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#6366f1" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          {user.phoneNumber && (
            <View style={styles.userPhoneRow}>
              <Ionicons name="call-outline" size={12} color="#9ca3af" />
              <Text style={styles.userPhone}>{user.phoneNumber}</Text>
            </View>
          )}
          <View style={styles.userMetaRow}>
            <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
            <Text style={styles.userMetaText}>Joined {formatDate(user.createdAt)}</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.statusToggleBtn,
            { backgroundColor: user.isActive ? '#fef2f2' : '#f0fdf4', borderColor: user.isActive ? '#fecaca' : '#bbf7d0' },
          ]}
          onPress={onToggleStatus}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={user.isActive ? '#ef4444' : '#10b981'} />
          ) : (
            <Text style={[styles.statusToggleText, { color: user.isActive ? '#ef4444' : '#10b981' }]}>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ============================================
// MAIN SCREEN COMPONENT
// ============================================

const UserManagementScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const users = useAppSelector(selectUsers);
  const pagination = useAppSelector(selectPagination);
  const isLoading = useAppSelector(selectIsLoading);
  const stats = useAppSelector(selectStats);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUsers();
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [statusFilter]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  const fetchUsers = useCallback((page = 1) => {
    const filters: any = { page, limit: 15 };
    if (search) filters.search = search;
    if (statusFilter === 'active') filters.isActive = true;
    if (statusFilter === 'inactive') filters.isActive = false;
    dispatch(getAllUsersAsync(filters));
  }, [dispatch, search, statusFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
    setTimeout(() => setRefreshing(false), 1000);
  }, [fetchUsers]);

  const handleToggleStatus = useCallback(async (user: User) => {
    const userId = user._id || user.id;
    if (!userId) return;

    Alert.alert(
      user.isActive ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.isActive ? 'Deactivate' : 'Activate',
          style: user.isActive ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoadingId(userId);
            try {
              if (user.isActive) {
                await dispatch(deactivateUserAsync(userId)).unwrap();
              } else {
                await dispatch(activateUserAsync(userId)).unwrap();
              }
              Alert.alert('Success', `User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update user status');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  }, [dispatch]);

  const handleNextPage = () => {
    if (pagination && pagination.page < pagination.pages) {
      fetchUsers(pagination.page + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination && pagination.page > 1) {
      fetchUsers(pagination.page - 1);
    }
  };

  const renderUserItem = ({ item, index }: { item: User; index: number }) => (
    <UserCard
      user={item}
      index={index}
      onToggleStatus={() => handleToggleStatus(item)}
      isLoading={actionLoadingId === (item._id || item.id)}
    />
  );

  const renderFooter = () => {
    if (!pagination || pagination.pages <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationBtn, pagination.page <= 1 && styles.paginationBtnDisabled]}
          onPress={handlePrevPage}
          disabled={pagination.page <= 1}
        >
          <Ionicons name="chevron-back" size={20} color={pagination.page <= 1 ? '#cbd5e1' : '#6366f1'} />
          <Text style={[styles.paginationBtnText, pagination.page <= 1 && styles.paginationBtnTextDisabled]}>Prev</Text>
        </TouchableOpacity>

        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>Page {pagination.page} of {pagination.pages}</Text>
          <Text style={styles.paginationTotal}>{pagination.total} users</Text>
        </View>

        <TouchableOpacity
          style={[styles.paginationBtn, pagination.page >= pagination.pages && styles.paginationBtnDisabled]}
          onPress={handleNextPage}
          disabled={pagination.page >= pagination.pages}
        >
          <Text style={[styles.paginationBtnText, pagination.page >= pagination.pages && styles.paginationBtnTextDisabled]}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={pagination.page >= pagination.pages ? '#cbd5e1' : '#6366f1'} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient colors={['#f1f5f9', '#e2e8f0']} style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={48} color="#94a3b8" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{search ? 'No Users Found' : 'No Users Yet'}</Text>
      <Text style={styles.emptySubtitle}>
        {search ? `No users match "${search}". Try a different search term.` : 'Users will appear here once they register.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      {/* Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>User Management</Text>
            </View>
            <Text style={styles.headerSubtitle}>{pagination?.total || 0} registered users</Text>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <FilterChip
            label="All"
            isActive={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
            count={pagination?.total}
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
      <StatsSummary total={stats.total} active={stats.active} inactive={stats.inactive} />

      {/* Users List */}
      {isLoading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366f1']} />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
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
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  searchClear: {
    padding: 4,
  },

  // Filters
  filtersContainer: {
    paddingVertical: 12,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    gap: 6,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  // Stats Summary
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },

  // User Card
  userCard: {
    backgroundColor: '#FFFFFF',
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
  userStatusBar: {
    height: 4,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  userAvatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  userPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  userPhone: {
    fontSize: 12,
    color: '#9ca3af',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  userMetaText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statusToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingTop: 4,
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
    color: '#64748b',
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
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  paginationBtnDisabled: {
    opacity: 0.5,
  },
  paginationBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  paginationBtnTextDisabled: {
    color: '#cbd5e1',
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  paginationTotal: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});

export default UserManagementScreen;