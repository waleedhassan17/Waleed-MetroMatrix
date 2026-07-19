import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { ChevronLeft, Minus, Plus, Search, Warehouse, X, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Shadows } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchInventory, selectInventory, updateStock } from './inventorySlice';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryLight: '#FFF5EB',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
};

const getStockLevel = (qty: number) => {
  if (qty === 0) return { color: B.error, bg: B.errorLight, label: 'Out of stock' };
  if (qty <= 5) return { color: B.warning, bg: B.warningLight, label: 'Low stock' };
  return { color: B.success, bg: B.successLight, label: 'In stock' };
};

const InventoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { rows } = useAppSelector(selectInventory);

  useEffect(() => {
    dispatch(fetchInventory());
  }, [dispatch]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const low = rows.filter((r) => r.stockQuantity > 0 && r.stockQuantity <= 5).length;
    const out = rows.filter((r) => r.stockQuantity === 0).length;
    return { total, low, out };
  }, [rows]);

  const renderRow = ({ item: row }: { item: typeof rows[0] }) => {
    const level = getStockLevel(row.stockQuantity);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{row.productName}</Text>
            <Text style={styles.sku}>{row.sku}</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
            <View style={[styles.levelDot, { backgroundColor: level.color }]} />
            <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.qtySection}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => dispatch(updateStock({ variantId: row.variantId, stockQuantity: Math.max(0, row.stockQuantity - 1) }))}
            >
              <Minus size={14} stroke={B.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.qtyDisplay}>
              <Text style={styles.qtyValue}>{row.stockQuantity}</Text>
              <Text style={styles.qtyLabel}>units</Text>
            </View>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => dispatch(updateStock({ variantId: row.variantId, stockQuantity: row.stockQuantity + 1 }))}
            >
              <Plus size={14} stroke={B.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.countLabel}>{stats.total} items</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        <View style={[styles.statChip, { backgroundColor: B.successLight }]}>
          <Text style={[styles.statNum, { color: B.success }]}>{stats.total - stats.low - stats.out}</Text>
          <Text style={[styles.statLabel, { color: B.success }]}>OK</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: B.warningLight }]}>
          <Text style={[styles.statNum, { color: B.warning }]}>{stats.low}</Text>
          <Text style={[styles.statLabel, { color: B.warning }]}>Low</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: B.errorLight }]}>
          <Text style={[styles.statNum, { color: B.error }]}>{stats.out}</Text>
          <Text style={[styles.statLabel, { color: B.error }]}>Out</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={16} stroke={B.textMuted} strokeWidth={2} />
        <TextInput
          placeholder="Search by product or SKU..."
          placeholderTextColor={B.textMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} stroke={B.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.variantId}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.notice}>
            <Warehouse size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.noticeText}>Stock changes are applied instantly in demo mode.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AlertTriangle size={28} stroke={B.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No items match your search</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_H + 10,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: B.text },
  countLabel: { fontSize: 12, fontWeight: '600', color: B.textMuted, marginTop: 1 },

  // Stats
  statsStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statNum: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: B.text, padding: 0 },

  // List
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  productName: { fontSize: 14, fontWeight: '700', color: B.text },
  sku: { fontSize: 12, color: B.textMuted, marginTop: 2 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  levelDot: { width: 6, height: 6, borderRadius: 3 },
  levelText: { fontSize: 11, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'flex-end' },
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: B.bg,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.primaryLight,
  },
  qtyDisplay: { alignItems: 'center', minWidth: 42 },
  qtyValue: { fontSize: 18, fontWeight: '800', color: B.text },
  qtyLabel: { fontSize: 10, fontWeight: '600', color: B.textMuted },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: B.primaryLight,
  },
  noticeText: { flex: 1, fontSize: 12, color: B.textSec },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: B.textMuted },
});

export default InventoryScreen;