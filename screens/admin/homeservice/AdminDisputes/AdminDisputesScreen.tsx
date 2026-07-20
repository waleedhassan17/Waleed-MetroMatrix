// ============================================
// Admin: disputes (HS8) — list by status, detail with evidence, resolve
// with outcome and optional refund or provider penalty.
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
  fetchAdminDisputes,
  resolveAdminDispute,
  AdminDispute,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
  danger: '#E74C3C',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#F59E0B',
  investigating: '#2A7FFF',
  resolved: '#27AE60',
  rejected: '#E74C3C',
};

const FILTERS = ['all', 'open', 'investigating', 'resolved', 'rejected'];

const AdminDisputesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<AdminDispute[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminDispute | null>(null);
  const [outcome, setOutcome] = useState<'resolved' | 'rejected' | 'investigating'>('resolved');
  const [resolution, setResolution] = useState('');
  const [refund, setRefund] = useState('');
  const [penalty, setPenalty] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminDisputes({ status });
    if (res.success) setRows(res.data || []);
    else setError(res.message || 'Failed to load disputes');
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async () => {
    if (!selected) return;
    if (outcome !== 'investigating' && !resolution.trim()) {
      Alert.alert('Resolution required', 'Describe the outcome — it is recorded and audited.');
      return;
    }
    setActing(true);
    const res = await resolveAdminDispute(selected.id, {
      status: outcome,
      resolution: resolution.trim(),
      refundAmount: refund ? Number(refund) : undefined,
      penalizeProvider: penalty ? Number(penalty) : undefined,
    });
    setActing(false);
    if (res.success) {
      setSelected(null);
      setResolution('');
      setRefund('');
      setPenalty('');
      load();
    } else {
      Alert.alert('Error', res.message || 'Could not update dispute');
    }
  };

  const renderItem = ({ item }: { item: AdminDispute }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={styles.cardTop}>
        <Text style={styles.reason} numberOfLines={1}>
          {item.reason}
        </Text>
        <View style={[styles.chip, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <Text style={[styles.chipText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {item.customer} vs {item.provider} · raised by {item.raisedByRole}
      </Text>
      <Text style={styles.metaLight}>{new Date(item.createdAt).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disputes</Text>
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
              <Ionicons name="shield-checkmark-outline" size={44} color="#DEE2E6" />
              <Text style={styles.stateText}>No disputes in this state.</Text>
            </View>
          }
        />
      )}

      {/* Detail + resolve modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selected?.reason}</Text>
              <Text style={styles.meta}>
                {selected?.customer} vs {selected?.provider} · against {selected?.againstRole}
              </Text>
              {!!selected?.description && (
                <Text style={styles.description}>{selected.description}</Text>
              )}
              {!!selected?.evidence?.length && (
                <ScrollView horizontal style={{ marginTop: 10 }}>
                  {selected.evidence.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.evidence} />
                  ))}
                </ScrollView>
              )}

              <Text style={styles.fieldLabel}>Outcome</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(['investigating', 'resolved', 'rejected'] as const).map((o) => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.targetChip, outcome === o && styles.targetChipActive]}
                    onPress={() => setOutcome(o)}
                  >
                    <Text style={[styles.targetText, outcome === o && styles.targetTextActive]}>
                      {o}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Resolution note…"
                placeholderTextColor={COLORS.textLight}
                value={resolution}
                onChangeText={setResolution}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Refund customer (Rs., optional)"
                placeholderTextColor={COLORS.textLight}
                value={refund}
                onChangeText={setRefund}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Provider penalty (Rs., optional)"
                placeholderTextColor={COLORS.textLight}
                value={penalty}
                onChangeText={setPenalty}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={resolve} disabled={acting}>
                  {acting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reason: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 13, color: COLORS.text, marginTop: 6 },
  metaLight: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  description: { fontSize: 13, color: COLORS.textLight, marginTop: 8, lineHeight: 19 },
  evidence: { width: 90, height: 90, borderRadius: 10, marginRight: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  targetChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  targetChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  targetText: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  targetTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modalActions: { flexDirection: 'row', marginTop: 16, marginBottom: 8 },
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
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
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

export default AdminDisputesScreen;
