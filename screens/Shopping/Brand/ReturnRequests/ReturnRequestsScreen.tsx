import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2, ChevronLeft, Package, XCircle, AlertTriangle, MessageSquare } from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchReturnRequests,
  selectReturnRequests,
  updateReturnStatus,
  type ReturnServerStatus,
} from './returnRequestsSlice';

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
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
};

const STATUS_STYLES: Record<ReturnServerStatus, { color: string; bg: string; label: string }> = {
  requested: { color: B.warning, bg: B.warningLight, label: 'Requested' },
  approved: { color: B.success, bg: B.successLight, label: 'Approved' },
  rejected: { color: B.error, bg: B.errorLight, label: 'Rejected' },
  picked_up: { color: B.primary, bg: B.primaryLight, label: 'Picked Up' },
  refunded: { color: B.textMuted, bg: B.bg, label: 'Refunded' },
};

// Mirrors the backend's RETURN_FLOW exactly (vendorOrderController.js) —
// requested/rejected/refunded are terminal or single-branch; only these
// transitions are ever legal to offer.
const NEXT_RETURN_ACTIONS: Record<
  ReturnServerStatus,
  { status: ReturnServerStatus; label: string; color: string; icon: any }[]
> = {
  requested: [
    { status: 'approved', label: 'Approve', color: B.success, icon: CheckCircle2 },
    { status: 'rejected', label: 'Reject', color: B.error, icon: XCircle },
  ],
  approved: [{ status: 'picked_up', label: 'Mark Picked Up', color: B.primary, icon: Package }],
  picked_up: [{ status: 'refunded', label: 'Confirm Refund', color: B.success, icon: CheckCircle2 }],
  rejected: [],
  refunded: [],
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const ReturnRequestsScreen: React.FC = () => {
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
                    <Icon size={14} stroke="#FFF" strokeWidth={2} />
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

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Return Requests</Text>
          <Text style={styles.countLabel}>{requests.length} request{requests.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={B.primary} />
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
    backgroundColor: B.primaryLight,
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: B.primary },
  customerName: { fontSize: 14, fontWeight: '700', color: B.text },
  requestMeta: { fontSize: 11, color: B.textMuted, marginTop: 1 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

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
  reason: { flex: 1, fontSize: 13, color: B.text, lineHeight: 18 },

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
  refundText: { fontSize: 16, fontWeight: '800', color: B.text },
  refundLabel: { fontSize: 12, fontWeight: '600', color: B.textMuted },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  finalStateText: { fontSize: 12, color: B.textMuted, fontStyle: 'italic' },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: B.primary },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

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
  emptyTitle: { fontSize: 17, fontWeight: '800', color: B.text },
  emptyText: { fontSize: 13, color: B.textMuted, textAlign: 'center', maxWidth: 260 },
});

export default ReturnRequestsScreen;