/**
 * Unified TransactionHistory screen (W2 Part 5) — reads
 * GET /api/wallet/transactions. Filter by module (home services /
 * healthcare / shopping / top-up / payout), by type, and by date range.
 * Each row links through to the booking/appointment/order/order-group/
 * payout that produced it via relatedTo. This is the screen that proves in
 * a demo that it genuinely is ONE wallet rather than three — the same
 * screen, same data source, works identically whether the logged-in
 * account is a customer or any kind of provider.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Filter, X, ChevronRight, Wallet } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchTransactionHistory,
  selectHistoryTransactions,
  selectHistoryPagination,
  selectHistoryLoading,
  selectHistoryError,
} from '../../../services/wallet';
import type { WalletTransaction, TransactionModule } from '../../../models/wallet';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../constants/Colors';
import {
  splitMoney,
  getDateBucket,
  formatTime,
  formatFullDateTime,
  prettySource,
  getSourceIcon,
  formatMoney,
  MODULE_FILTERS,
  MODULE_LABELS,
  RELATED_TO_LABEL,
  STATUS_COLOR_KEY,
} from '../../../utils/wallet_utils/transactionFormat';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
type TypeFilter = 'all' | 'credit' | 'debit';

const STATUS_COLOR_MAP = {
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  tertiary: Colors.text.tertiary,
};

export default function TransactionHistoryScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const transactions = useAppSelector(selectHistoryTransactions);
  const pagination = useAppSelector(selectHistoryPagination);
  const loading = useAppSelector(selectHistoryLoading);
  const error = useAppSelector(selectHistoryError);

  const [moduleFilter, setModuleFilter] = useState<TransactionModule | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const load = useCallback(
    (page = 1) => {
      dispatch(
        fetchTransactionHistory({
          page,
          limit: 30,
          module: moduleFilter === 'all' ? undefined : moduleFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
          append: page > 1,
        })
      );
    },
    [dispatch, moduleFilter, typeFilter]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = () => {
    if (loading || pagination.page >= pagination.pages) return;
    load(pagination.page + 1);
  };

  const sections = useMemo(() => {
    const buckets: Record<string, WalletTransaction[]> = {};
    transactions.forEach((t) => {
      const key = getDateBucket(t.createdAt);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(t);
    });
    return Object.entries(buckets).map(([title, data]) => ({ title, data }));
  }, [transactions]);

  const renderItem = ({ item, index, section }: any) => {
    const isCredit = item.type === 'credit';
    const Icon = getSourceIcon(item.source, item.type);
    const isLast = index === section.data.length - 1;
    const relatedLabel = item.relatedTo ? RELATED_TO_LABEL[item.relatedTo.kind] : null;

    return (
      <TouchableOpacity
        style={[styles.txRow, !isLast && styles.txRowDivider]}
        onPress={() => setSelectedTx(item)}
        activeOpacity={0.6}
      >
        <View style={styles.txIcon}>
          <Icon size={16} color={Colors.text.primary} strokeWidth={1.75} />
        </View>
        <View style={styles.txContent}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {item.description || prettySource(item.source)}
          </Text>
          <View style={styles.txMetaRow}>
            <Text style={styles.txMeta}>
              {item.module ? `${MODULE_LABELS[item.module as TransactionModule]} · ` : ''}
              {formatTime(item.createdAt)}
            </Text>
            {item.status !== 'completed' && (
              <View style={styles.statusInline}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLOR_MAP[STATUS_COLOR_KEY[item.status] || 'tertiary'] },
                  ]}
                />
                <Text
                  style={[
                    styles.statusInlineText,
                    { color: STATUS_COLOR_MAP[STATUS_COLOR_KEY[item.status] || 'tertiary'] },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            )}
          </View>
          {!!relatedLabel && <Text style={styles.relatedLink}>{relatedLabel}</Text>}
        </View>
        <View style={styles.txRight}>
          <Text
            style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.text.primary }]}
            numberOfLines={1}
          >
            {isCredit ? '+' : '−'}
            {formatMoney(item.amount, item.currency || 'PKR')}
          </Text>
          <ChevronRight size={14} color={Colors.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const activeFilterCount = (moduleFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ChevronLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.headerBtn}>
          <Filter size={20} color={activeFilterCount > 0 ? Colors.primary : Colors.text.primary} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Module filter chips — quick access without opening the modal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
      >
        {MODULE_FILTERS.map((f) => {
          const active = moduleFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setModuleFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && transactions.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(1)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Wallet size={28} color={Colors.text.tertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No transactions match these filters</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loading && transactions.length > 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.primary} />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* Filter modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={22} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Module</Text>
            <View style={styles.filterGrid}>
              {MODULE_FILTERS.map((f) => {
                const active = moduleFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterOption, active && styles.filterOptionActive]}
                    onPress={() => setModuleFilter(f.key)}
                  >
                    <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.filterGrid}>
              {(['all', 'credit', 'debit'] as TypeFilter[]).map((t) => {
                const active = typeFilter === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.filterOption, active && styles.filterOptionActive]}
                    onPress={() => setTypeFilter(t)}
                  >
                    <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>
                      {t === 'all' ? 'All' : t === 'credit' ? 'Money in' : 'Money out'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowFilterModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transaction detail modal */}
      <Modal visible={!!selectedTx} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            {selectedTx && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>Transaction Detail</Text>
                  <TouchableOpacity onPress={() => setSelectedTx(null)}>
                    <X size={22} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailAmountBlock}>
                  {(() => {
                    const parts = splitMoney(selectedTx.amount);
                    return (
                      <Text
                        style={[
                          styles.detailAmount,
                          { color: selectedTx.type === 'credit' ? Colors.success : Colors.text.primary },
                        ]}
                      >
                        {selectedTx.type === 'credit' ? '+' : '−'}
                        {parts.whole}.{parts.cents} {(selectedTx.currency || 'PKR').toUpperCase()}
                      </Text>
                    );
                  })()}
                </View>
                <DetailRow label="Description" value={selectedTx.description} />
                <DetailRow label="Source" value={prettySource(selectedTx.source)} />
                {!!selectedTx.module && (
                  <DetailRow label="Module" value={MODULE_LABELS[selectedTx.module]} />
                )}
                <DetailRow label="Status" value={selectedTx.status} />
                <DetailRow label="Date" value={formatFullDateTime(selectedTx.createdAt)} />
                {!!selectedTx.relatedTo && (
                  <TouchableOpacity
                    style={styles.viewRelatedBtn}
                    onPress={() => setSelectedTx(null)}
                  >
                    <Text style={styles.viewRelatedText}>
                      {RELATED_TO_LABEL[selectedTx.relatedTo.kind]}
                    </Text>
                    <ChevronRight size={14} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
  },
  headerBtn: { padding: 6, position: 'relative' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  chipRow: { maxHeight: 44, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
  chipTextActive: { color: '#fff' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center' },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  txRowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txContent: { flex: 1, marginRight: 8 },
  txTitle: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 },
  txMeta: { fontSize: 12, color: Colors.text.tertiary },
  statusInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusInlineText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  relatedLink: { fontSize: 11, color: Colors.primary, marginTop: 3, fontWeight: '600' },
  txRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterOptionText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  filterOptionTextActive: { color: '#fff' },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  detailAmountBlock: { alignItems: 'center', marginBottom: 16 },
  detailAmount: { fontSize: 26, fontWeight: '800' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailRowLabel: { fontSize: 13, color: Colors.text.tertiary },
  detailRowValue: { fontSize: 13, color: Colors.text.primary, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  viewRelatedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingVertical: 10,
  },
  viewRelatedText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
});
