import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Search,
  Plus,
  Edit3,
  Trash2,
  Package,
  Store,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';

import type { AdminShoppingParamList } from '../../../../types/shopping';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchBrandsAsync,
  setStatusFilter,
  setSearchQuery,
  setBrandStatusAsync,
  deleteBrandAsync,
  clearError,
  selectFilteredBrands,
  selectStatusFilter,
  selectSearchQuery,
  selectIsLoading,
  selectError,
} from './brandManagementSlice';
import type { BrandStatusFilter } from './brandManagementSlice';

type NavigationProp = NativeStackNavigationProp<AdminShoppingParamList>;

const COLORS = {
  primary: '#E67E22',
  success: '#27AE60',
  danger: '#E74C3C',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const FILTERS: { key: BrandStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

const BrandManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const brands = useAppSelector(selectFilteredBrands);
  const statusFilter = useAppSelector(selectStatusFilter);
  const searchQuery = useAppSelector(selectSearchQuery);
  const loading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);

  useEffect(() => {
    dispatch(fetchBrandsAsync());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleDelete = useCallback((brandId: string, name: string) => {
    Alert.alert(
      'Delete Brand',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteBrandAsync(brandId)),
        },
      ]
    );
  }, [dispatch]);

  // Approve pending brands / suspend or reactivate — closes the vendor
  // onboarding loop. Reason is recorded in the server audit trail.
  const handleStatusChange = useCallback(
    (item: any, status: 'active' | 'suspended', label: string) => {
      Alert.prompt?.(
        `${label} brand`,
        `Reason for ${label.toLowerCase()}ing "${item.name}" (recorded in the audit log):`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: label,
            onPress: (reason?: string) =>
              dispatch(setBrandStatusAsync({ brandId: item.brandId, status, reason: reason || `${label} by admin` })),
          },
        ],
        'plain-text'
      ) ??
        Alert.alert(`${label} brand`, `${label} "${item.name}"? This is recorded in the audit log.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: label,
            onPress: () =>
              dispatch(setBrandStatusAsync({ brandId: item.brandId, status, reason: `${label} by admin` })),
          },
        ]);
    },
    [dispatch]
  );

  const renderBrandCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.brandAvatar, { backgroundColor: item.primaryColor || COLORS.primary }]}>
          <Text style={styles.brandInitial}>{item.name?.charAt(0).toUpperCase() || 'B'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.brandName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.brandSlug}>{item.slug}{item.ownerName ? ` · ${item.ownerName}` : ''}</Text>
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Package size={14} stroke={COLORS.textLight} strokeWidth={1.75} />
          <Text style={styles.statText}>{item.productCount ?? 0} products</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[
            styles.statusBadge,
            item.status === 'active' ? styles.statusActive : styles.statusInactive,
          ]}>
            {item.status === 'pending' ? 'Pending approval' : item.status === 'suspended' ? 'Suspended' : 'Active'}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleStatusChange(item, 'active', 'Approve')}
          >
            <Text style={[styles.actionText, { color: COLORS.success }]}>Approve</Text>
          </TouchableOpacity>
        )}
        {item.status === 'active' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleStatusChange(item, 'suspended', 'Suspend')}
          >
            <Text style={[styles.actionText, { color: COLORS.danger }]}>Suspend</Text>
          </TouchableOpacity>
        )}
        {item.status === 'suspended' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleStatusChange(item, 'active', 'Reactivate')}
          >
            <Text style={[styles.actionText, { color: COLORS.success }]}>Reactivate</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminBrandDetail, { brandId: item.brandId })}
        >
          <Edit3 size={16} stroke={COLORS.primary} strokeWidth={2} />
          <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.brandId, item.name)}
        >
          <Trash2 size={16} stroke={COLORS.danger} strokeWidth={2} />
          <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Package size={40} stroke={COLORS.textLight} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No brands found</Text>
      <Text style={styles.emptySubtitle}>Add your first brand to get started</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ChevronLeft size={22} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Brand Management</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminOutletList)}
        >
          <Store size={20} stroke={COLORS.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={18} stroke={COLORS.textLight} strokeWidth={1.75} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
          placeholder="Search brands..."
          placeholderTextColor={COLORS.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
            <Text style={styles.clearSearch}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              statusFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => dispatch(setStatusFilter(f.key))}
          >
            <Text style={[
              styles.filterText,
              statusFilter === f.key && styles.filterTextActive,
            ]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={brands}
        keyExtractor={(item) => item.brandId}
        renderItem={renderBrandCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminAddBrand, {})}
      >
        <Plus size={24} stroke="#FFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: (StatusBar.currentHeight || 44) + Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: COLORS.card,
    ...Shadows.small,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  clearSearch: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.textLight },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInitial: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  cardInfo: { flex: 1 },
  brandName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  brandSlug: { fontSize: 12, color: COLORS.textLight },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: COLORS.textLight },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  statusActive: { backgroundColor: 'rgba(39,174,96,0.12)', color: COLORS.success },
  statusInactive: { backgroundColor: 'rgba(108,117,125,0.12)', color: COLORS.textLight },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: Spacing.md },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
});

export default BrandManagementScreen;
