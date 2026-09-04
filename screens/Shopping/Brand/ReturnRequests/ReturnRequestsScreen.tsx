import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2, Package, XCircle, AlertTriangle, MessageSquare } from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchReturnRequests,
  selectReturnRequests,
  updateReturnStatus,
  type ReturnServerStatus,
} from './returnRequestsSlice';
import { B } from '../theme';
import BrandHeader from '../BrandHeader';
import { ThemeColors, useTheme } from '../../../../theme';
import { C, F, T } from '../../../../constants/theme';

// Theme-parameterised for the same reason the stylesheet is: 'Picked Up' is
// carried by the brand's own colour, and these maps live at module scope where
// a hook cannot reach.
const statusStyles = (c: ThemeColors): Record<ReturnServerStatus, { color: string; bg: string; label: string }> => ({
  requested: { color: B.warning, bg: B.warningLight, label: 'Requested' },
  approved: { color: B.success, bg: B.successLight, label: 'Approved' },
  rejected: { color: B.error, bg: B.errorLight, label: 'Rejected' },
  picked_up: { color: c.accent, bg: c.accentSoft, label: 'Picked Up' },
  refunded: { color: B.textMuted, bg: B.bg, label: 'Refunded' },
});

// Mirrors the backend's RETURN_FLOW exactly (vendorOrderController.js) —
// requested/rejected/refunded are terminal or single-branch; only these
// transitions are ever legal to offer.
const nextReturnActions = (c: ThemeColors): Record<
  ReturnServerStatus,
  { status: ReturnServerStatus; label: string; color: string; icon: any }[]
> => ({
  requested: [
    { status: 'approved', label: 'Approve', color: B.success, icon: CheckCircle2 },
    { status: 'rejected', label: 'Reject', color: B.error, icon: XCircle },
  ],
  approved: [{ status: 'picked_up', label: 'Mark Picked Up', color: c.accent, icon: Package }],
  picked_up: [{ status: 'refunded', label: 'Confirm Refund', color: B.success, icon: CheckCircle2 }],
  rejected: [],
  refunded: [],
});

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const ReturnRequestsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_STYLES = useMemo(() => statusStyles(colors), [colors]);
  const NEXT_RETURN_ACTIONS = useMemo(() => nextReturnActions(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { requests, loading, error } = useAppSelector(selectReturnRequests);

  useEffect(() => {
    dispatch(fetchReturnRequests());
  }, [dispatch]);

  const handleTransition = async (requestId: string, status: ReturnServerStatus) => {
    const result = await dispatch(updateReturnStatus({ requestId, status }));
    if (updateReturnStatus.rejected.match(result)) {
      Alert.alert('Could not update return', (result.payload as string) || 'Please try again.');
    }
  };

  const renderRequest = ({ item: request }: { item: typeof requests[0] }) => {
    const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.requested;
    const nextActions = NEXT_RETURN_ACTIONS[request.status] || [];
    const initials = getInitials(request.customerName);

    return (
      <View style={styles.card}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{request.customerName}</Text>
            <Text style={styles.requestMeta}>{request.requestId} · Order {request.orderId}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {/* Reason */}
        <View style={styles.reasonWrap}>
          <MessageSquare size={14} stroke={B.textMuted} strokeWidth={2} />
          <Text style={styles.reason}>{request.reason}</Text>
        </View>

        {/* Bottom */}
        <View style={styles.cardBottom}>
          <View style={styles.refundBadge}>
            <Text style={styles.refundText}>₨{request.refundAmount.toLocaleString()}</Text>
            <Text style={styles.refundLabel}>refund</Text>
          </View>
          {nextActions.length > 0 ? (
            <View style={styles.actions}>
              {nextActions.map((action) => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={action.status}
                    style={[styles.actionBtn, { backgroundColor: action.color }]}
                    onPress={() => handleTransition(request.requestId, action.status)}
                  >
                    <Icon size={14} stroke={C.surface} strokeWidth={2} />
                    <Text style={styles.actionText}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.finalStateText}>No further action</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      <BrandHeader
        title="Return Requests"
        subtitle={`${requests.length} request${requests.length !== 1 ? 's' : ''}`}
        showBack
      />

      {loading && requests.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error && requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Couldn't load return requests</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchReturnRequests())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.requestId}
          renderItem={renderRequest}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <AlertTriangle size={32} stroke={B.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No return requests</Text>
              <Text style={styles.emptyText}>When customers submit return requests, they will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },

  // Content
  content: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  avatarText: { ...T.body, fontFamily: F.bold, color: c.accent },
  customerName: { ...T.body, fontFamily: F.bold, color: B.text },
  requestMeta: { ...T.caption, color: B.textMuted, marginTop: 1 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { ...T.caption, fontFamily: F.bold, textTransform: 'capitalize' },

  // Reason
  reasonWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: B.bg,
  },
  reason: { flex: 1, ...T.label, fontFamily: F.regular, color: B.text, lineHeight: 18 },

  // Bottom
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  refundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refundText: { ...T.subhead, fontFamily: F.bold, color: B.text },
  refundLabel: { ...T.caption, fontFamily: F.semibold, color: B.textMuted },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionText: { color: C.surface, ...T.caption, fontFamily: F.bold },
  finalStateText: { ...T.caption, color: B.textMuted, fontStyle: 'italic' },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: c.accent },
  retryText: { color: C.surface, ...T.label, fontFamily: F.bold },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
    marginBottom: 8,
  },
  emptyTitle: { ...T.subhead, fontFamily: F.bold, color: B.text },
  emptyText: { ...T.label, fontFamily: F.regular, color: B.textMuted, textAlign: 'center', maxWidth: 260 },
});

export default ReturnRequestsScreen;