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
  MapPin,
  Store,
  Link2,
  AlertCircle,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { AdminShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import type { AdminShoppingParamList } from '../../../../types/shopping';
import type { OutletConfig } from '../../../../types/shopping';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchOutletsAsync,
  setStatusFilter,
  setSearchQuery,
  toggleOutletStatus,
  deleteOutlet,
  clearError,
  selectFilteredOutlets,
  selectOutletStatusFilter,
  selectOutletSearchQuery,
  selectOutletMgmtLoading,
  selectOutletMgmtError,
} from './outletManagementSlice';
import type { OutletStatusFilter } from './outletManagementSlice';

type NavigationProp = NativeStackNavigationProp<AdminShoppingParamList>;

const COLORS = {
  primary: '#E67E22',
  success: '#27AE60',
  danger: '#E74C3C',
  warning: '#F39C12',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
  unassigned: '#3498DB',
};

const FILTERS: { key: OutletStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'unassigned', label: 'Unassigned' },
];

const OutletManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const outlets = useAppSelector(selectFilteredOutlets);
  const statusFilter = useAppSelector(selectOutletStatusFilter);
  const searchQuery = useAppSelector(selectOutletSearchQuery);
  const loading = useAppSelector(selectOutletMgmtLoading);
  const error = useAppSelector(selectOutletMgmtError);

  useEffect(() => {
    dispatch(fetchOutletsAsync());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleDelete = useCallback((outletId: string, name: string) => {
    Alert.alert(
      'Delete Outlet',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteOutlet(outletId)),
        },
      ]
    );
  }, [dispatch]);

  const renderOutletCard = ({ item }: { item: OutletConfig }) => {
    const schemeColor = item.colorScheme?.primaryColor || item.brandPrimaryColor || COLORS.primary;
    const hasScheme = !!item.colorScheme;

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.outletAvatar, { backgroundColor: schemeColor }]}>
            <Store size={18} stroke="#FFF" strokeWidth={2} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.outletName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.locationRow}>
              <MapPin size={11} stroke={COLORS.textLight} strokeWidth={2} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location.city}, {item.location.country}
              </Text>
            </View>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => { dispatch(toggleOutletStatus(item.outletId)); }}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
          />
        </View>

        {/* Brand assignment row */}
        <View style={styles.assignmentRow}>
          {item.brandId ? (
            <View style={styles.brandChip}>
              <Link2 size={11} stroke={COLORS.success} strokeWidth={2} />
              <Text style={styles.brandChipText}>{item.brandName || 'Assigned brand'}</Text>
            </View>
          ) : (
            <View style={[styles.brandChip, styles.brandChipUnassigned]}>
              <AlertCircle size={11} stroke={COLORS.unassigned} strokeWidth={2} />
              <Text style={[styles.brandChipText, { color: COLORS.unassigned }]}>No brand assigned</Text>
            </View>
          )}
          {hasScheme && (
            <View style={styles.schemeRow}>
              <View style={[styles.schemeDot, { backgroundColor: item.colorScheme!.primaryColor }]} />
              <View style={[styles.schemeDot, { backgroundColor: item.colorScheme!.secondaryColor }]} />
              <View style={[styles.schemeDot, { backgroundColor: item.colorScheme!.accentColor }]} />
              <Text style={styles.schemeLabel}>Custom colors</Text>
            </View>
          )}
        </View>

        {/* Status + actions */}
        <View style={styles.cardFooter}>
          <Text style={[
            styles.statusBadge,
            item.isActive ? styles.statusActive : styles.statusInactive,
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminOutletDetail, { outletId: item.outletId })}
            >
              <Edit3 size={15} stroke={COLORS.primary} strokeWidth={2} />
              <Text style={[styles.actionText, { color: COLORS.primary }]}>Manage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item.outletId, item.name)}
            >
              <Trash2 size={15} stroke={COLORS.danger} strokeWidth={2} />
              <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Store size={40} stroke={COLORS.textLight} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No outlets found</Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter === 'unassigned'
          ? 'All outlets are assigned to brands'
          : 'Add your first outlet to get started'}
      </Text>
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
        <View>
          <Text style={styles.headerTitle}>Outlet Management</Text>
          <Text style={styles.headerSub}>{outlets.length} outlet{outlets.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={18} stroke={COLORS.textLight} strokeWidth={1.75} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
          placeholder="Search outlets, brands, cities..."
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
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => dispatch(setStatusFilter(f.key))}
          >
            <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={outlets}
        keyExtractor={(item) => item.outletId}
        renderItem={renderOutletCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshing={loading}
        onRefresh={() => dispatch(fetchOutletsAsync())}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(AdminShoppingRouteNames.AdminAddOutlet, {})}
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
  headerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
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
    flexWrap: 'wrap',
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
    marginBottom: Spacing.sm,
  },
  outletAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  outletName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationText: { fontSize: 12, color: COLORS.textLight, flex: 1 },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(39,174,96,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  brandChipUnassigned: {
    backgroundColor: 'rgba(52,152,219,0.1)',
  },
  brandChipText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  schemeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  schemeDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  schemeLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '500' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
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
  cardActions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: Spacing.md },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.xl },
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

export default OutletManagementScreen;
