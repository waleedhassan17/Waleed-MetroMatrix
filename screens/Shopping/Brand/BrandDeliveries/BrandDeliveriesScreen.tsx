import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Clock,
  MapPin,
  Package,
  Search,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  selectFilteredShipments,
  selectDeliveryKpis,
  selectCourierStats,
  selectDeliveryFilter,
  selectDeliverySearch,
  setDeliveryFilter,
  fetchDeliveries,
  setDeliverySearch,
  type DeliveryFilter,
  type Shipment,
  type DeliveryStatus,
} from './brandDeliveriesSlice';
import { B } from '../theme';
import BrandHeader from '../BrandHeader';
import { ThemeColors, useTheme } from '../../../../theme';
import { C, F, T } from '../../../../constants/theme';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; bg: string; Icon: any }> = {
  pending_pickup: { label: 'Pending Pickup', color: B.amber, bg: B.amberLight, Icon: Clock },
  in_transit: { label: 'In Transit', color: B.info, bg: B.infoLight, Icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: B.purple, bg: B.purpleLight, Icon: MapPin },
  delivered: { label: 'Delivered', color: B.success, bg: B.successLight, Icon: CheckCircle2 },
  failed: { label: 'Failed', color: B.error, bg: B.errorLight, Icon: XCircle },
  returned: { label: 'Returned', color: B.textMuted, bg: C.surfaceSunken, Icon: RotateCcw },
};

const FILTERS: { key: DeliveryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_pickup', label: 'Pickup' },
  { key: 'in_transit', label: 'Transit' },
  { key: 'out_for_delivery', label: 'Out' },
  { key: 'delivered', label: 'Done' },
  { key: 'failed', label: 'Failed' },
];

const BrandDeliveriesScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const shipments = useAppSelector(selectFilteredShipments);
  const kpis = useAppSelector(selectDeliveryKpis);
  const courierStats = useAppSelector(selectCourierStats);
  const filter = useAppSelector(selectDeliveryFilter);
  const searchQuery = useAppSelector(selectDeliverySearch);

  useEffect(() => {
    dispatch(fetchDeliveries());
  }, [dispatch]);

  const renderKpis = () => (
    <View style={styles.kpiRow}>
      {[
        { label: 'Total', value: kpis.totalShipments, color: B.text },
        { label: 'Pickup', value: kpis.pendingPickup, color: B.amber },
        { label: 'Transit', value: kpis.inTransit, color: B.info },
        { label: 'Done', value: kpis.delivered, color: B.success },
        { label: 'Issues', value: kpis.failed, color: B.error },
      ].map((k) => (
        <View key={k.label} style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
          <Text style={styles.kpiLabel}>{k.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderCourierStats = () => (
    <View style={styles.courierCard}>
      <Text style={styles.sectionTitle}>Courier Performance</Text>
      {courierStats.map((c, idx) => (
        <View key={c.courierName} style={[styles.courierRow, idx < courierStats.length - 1 && styles.courierRowBorder]}>
          <View style={styles.courierLeft}>
            <View style={styles.courierAvatar}>
              <Truck size={14} stroke={colors.accent} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.courierName}>{c.courierName}</Text>
              <Text style={styles.courierMeta}>
                {c.totalShipments} shipments · avg {c.avgDeliveryDays}d
              </Text>
            </View>
          </View>
          <View style={[styles.successBadge, { backgroundColor: c.successRate >= 95 ? B.successLight : B.amberLight }]}>
            <Text style={[styles.successText, { color: c.successRate >= 95 ? B.success : B.amber }]}>
              {c.successRate}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderShipmentCard = ({ item }: { item: Shipment }) => {
    const cfg = STATUS_CONFIG[item.status];
    const StatusIcon = cfg.Icon;
    return (
      <View style={styles.shipCard}>
        <View style={styles.shipHeader}>
          <View style={styles.shipHeaderLeft}>
            <Text style={styles.shipOrderId}>{item.orderId}</Text>
            <Text style={styles.shipId}>{item.shipmentId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <StatusIcon size={12} stroke={cfg.color} strokeWidth={2} />
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.shipBody}>
          <View style={styles.shipRow}>
            <Text style={styles.shipFieldLabel}>Customer</Text>
            <Text style={styles.shipFieldValue}>{item.customerName}, {item.customerCity}</Text>
          </View>
          <View style={styles.shipRow}>
            <Text style={styles.shipFieldLabel}>Courier</Text>
            <Text style={styles.shipFieldValue}>{item.courier} · {item.trackingNumber}</Text>
          </View>
          <View style={styles.shipRow}>
            <Text style={styles.shipFieldLabel}>Items</Text>
            <Text style={styles.shipFieldValue}>{item.itemCount} items · ₨{item.totalValue.toLocaleString()}</Text>
          </View>
          <View style={styles.shipRow}>
            <Text style={styles.shipFieldLabel}>Dispatched</Text>
            <Text style={styles.shipFieldValue}>{item.dispatchedAt}</Text>
          </View>
          {item.status === 'delivered' && item.deliveredAt && (
            <View style={styles.shipRow}>
              <Text style={styles.shipFieldLabel}>Delivered</Text>
              <Text style={[styles.shipFieldValue, { color: B.success }]}>{item.deliveredAt}</Text>
            </View>
          )}
          {item.status !== 'delivered' && (
            <View style={styles.shipRow}>
              <Text style={styles.shipFieldLabel}>ETA</Text>
              <Text style={[styles.shipFieldValue, { color: colors.accent, fontFamily: F.bold }]}>{item.estimatedDelivery}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderKpis()}

      {/* Avg delivery time */}
      <View style={styles.avgTimeCard}>
        <Clock size={16} stroke={colors.accent} strokeWidth={2} />
        <Text style={styles.avgTimeLabel}>Average Delivery Time</Text>
        <Text style={styles.avgTimeValue}>{kpis.avgDeliveryTime}</Text>
      </View>

      {renderCourierStats()}

      <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>
        Shipments ({shipments.length})
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Package size={36} stroke={B.textMuted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No shipments found</Text>
      <Text style={styles.emptyDesc}>Try changing filters or search term</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={B.bg} />

      {/* ── Header ── */}
      <BrandHeader title="Deliveries" showBack />

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Search size={16} stroke={B.textMuted} strokeWidth={1.75} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(t) => dispatch(setDeliverySearch(t))}
          placeholder="Search orders, tracking, customers..."
          placeholderTextColor={B.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(setDeliverySearch(''))}>
            <Text style={styles.clearBtn}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => dispatch(setDeliveryFilter(f.key))}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={shipments}
        keyExtractor={(item) => item.shipmentId}
        renderItem={renderShipmentCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: B.surface,
    borderWidth: 1,
    borderColor: B.border,
    gap: 8,
  },
  searchInput: { flex: 1, ...T.body, color: B.text },
  clearBtn: { ...T.caption, fontFamily: F.bold, color: c.accent },

  // Filters
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: B.surface,
    borderWidth: 1,
    borderColor: B.border,
  },
  filterChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  filterText: { ...T.caption, fontFamily: F.bold, color: B.textSec },
  filterTextActive: { color: C.surface },

  listContent: { padding: 16, paddingBottom: 40 },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: B.surface,
    elevation: 1,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  kpiValue: { ...T.heading, fontFamily: F.bold },
  kpiLabel: { ...T.caption, fontFamily: F.semibold, color: B.textMuted, marginTop: 2 },

  // Avg time
  avgTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.accentSoft,
    marginBottom: 12,
  },
  avgTimeLabel: { flex: 1, ...T.label, fontFamily: F.semibold, color: B.text },
  avgTimeValue: { ...T.subhead, fontFamily: F.bold, color: c.accent },

  // Courier
  courierCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: B.surface,
    elevation: 1,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionTitle: { ...T.body, fontFamily: F.bold, color: B.text, marginBottom: 12 },
  courierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  courierRowBorder: { borderBottomWidth: 1, borderBottomColor: B.border },
  courierLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  courierAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierName: { ...T.label, fontFamily: F.bold, color: B.text },
  courierMeta: { ...T.caption, color: B.textMuted, marginTop: 1 },
  successBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  successText: { ...T.caption, fontFamily: F.bold },

  // Shipment Card
  shipCard: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: B.surface,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  shipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: B.bg,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  shipHeaderLeft: { gap: 1 },
  shipOrderId: { ...T.label, fontFamily: F.bold, color: B.text },
  shipId: { ...T.caption, color: B.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusLabel: { ...T.caption, fontFamily: F.bold },
  shipBody: { padding: 14, gap: 6 },
  shipRow: { flexDirection: 'row', justifyContent: 'space-between' },
  shipFieldLabel: { ...T.caption, fontFamily: F.semibold, color: B.textMuted },
  shipFieldValue: { ...T.caption, fontFamily: F.semibold, color: B.text, textAlign: 'right', flex: 1, marginLeft: 16 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { ...T.subhead, fontFamily: F.bold, color: B.text, marginTop: 12 },
  emptyDesc: { ...T.label, fontFamily: F.regular, color: B.textMuted, marginTop: 4 },
});

export default BrandDeliveriesScreen;
