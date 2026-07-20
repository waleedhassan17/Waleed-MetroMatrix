// ============================================
// Admin: provider payout requests (HS8) — approve (debits the provider
// wallet ledger) or reject with a reason; shows available balance.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchAdminPayouts,
  decideAdminPayout,
  AdminPayoutRow,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
  success: '#27AE60',
  danger: '#E74C3C',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#27AE60',
  rejected: '#E74C3C',
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'];

const AdminPayoutsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminPayoutRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminPayouts({ status });
    if (res.success) setRows(res.data || []);
    else setError(res.message || 'Failed to load payout requests');
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = (row: AdminPayoutRow) => {
    Alert.alert(
      'Approve payout',
      `Pay Rs. ${row.amount.toLocaleString()} to ${row.provider?.name}? This debits their wallet ledger and is audited.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActing(true);
            const res = await decideAdminPayout(row.id, 'approve');
            setActing(false);
            if (res.success) load();
            else Alert.alert('Error', res.message || 'Approval failed');
          },
        },
      ]
    );
  };

  const reject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      Alert.alert('Reason required', 'A rejection must include a reason.');
      return;
    }
    setActing(true);
    const res = await decideAdminPayout(rejecting.id, 'reject', rejectReason.trim());
    setActing(false);
    if (res.success) {
      setRejecting(null);
      setRejectReason('');
      load();
    } else {
      Alert.alert('Error', res.message || 'Rejection failed');
    }
  };

  const renderItem = ({ item }: { item: AdminPayoutRow }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Image source={{ uri: item.provider?.avatar }} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{item.provider?.name || 'Provider'}</Text>
          <Text style={styles.metaLight}>
            ★ {item.provider?.rating ?? 0} · {item.provider?.completedJobs ?? 0} jobs · balance Rs.{' '}
            {item.provider?.walletBalance?.toLocaleString?.() ?? 0}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <Text style={[styles.chipText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>Rs. {item.amount.toLocaleString()}</Text>
        <Text style={styles.metaLight}>
          {item.method} · {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {item.status === 'pending' && (
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.actBtn, { backgroundColor: COLORS.success }]}
            onPress={() => approve(item)}
            disabled={acting}
          >
            <Text style={styles.actText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, { backgroundColor: COLORS.danger }]}
            onPress={() => setRejecting(item)}
            disabled={acting}
          >
            <Text style={styles.actText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'rejected' && !!item.rejectionReason && (
        <Text style={[styles.metaLight, { marginTop: 6 }]}>Reason: {item.rejectionReason}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, status === s && styles.filterChipActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.filterText, status === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="wallet-outline" size={44} color="#DEE2E6" />
              <Text style={styles.stateText}>No payout requests here.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!rejecting} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject payout</Text>
            <Text style={styles.metaLight}>
              {rejecting?.provider?.name} — Rs. {rejecting?.amount?.toLocaleString()}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Mandatory reason…"
              placeholderTextColor={COLORS.textLight}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejecting(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: COLORS.danger }]}
                onPress={reject}
                disabled={acting}
              >
                {acting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  filterRow: { paddingHorizontal: 16, marginBottom: 4, maxHeight: 40 },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E9ECEF' },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  metaLight: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  actBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  actText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelText: { color: COLORS.text, fontWeight: '700' },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default AdminPayoutsScreen;
