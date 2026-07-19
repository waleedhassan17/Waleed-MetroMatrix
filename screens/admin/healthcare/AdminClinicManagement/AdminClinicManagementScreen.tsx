import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchAdminClinicsApi,
  setClinicStatusApi,
} from '../../../../networks/healthcare/adminApi';

const COLORS = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  success: '#27AE60',
  danger: '#E74C3C',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const AdminClinicManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [clinics, setClinics] = useState<any[]>([]);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminClinicsApi({ city: city || undefined });
    if (res.success) setClinics(res.data);
    else setError(res.message || 'Failed to load clinics');
    setLoading(false);
  }, [city]);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (clinic: any) => {
    const id = String(clinic.id || clinic._id);
    const activating = !clinic.isActive;
    Alert.alert(
      activating ? 'Activate clinic' : 'Deactivate clinic',
      `${activating ? 'Activate' : 'Deactivate'} "${clinic.name}"? This is recorded in the audit log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: activating ? 'Activate' : 'Deactivate',
          style: activating ? 'default' : 'destructive',
          onPress: async () => {
            const res = await setClinicStatusApi(id, activating, `${activating ? 'Activated' : 'Deactivated'} by admin`);
            if (res.success) {
              setClinics((list) =>
                list.map((c) => (String(c.id || c._id) === id ? { ...c, isActive: activating } : c))
              );
            } else {
              Alert.alert('Failed', res.message || 'Could not update clinic');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Clinics</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by city (e.g. Lahore)…"
          placeholderTextColor={COLORS.textLight}
          value={city}
          onChangeText={setCity}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={clinics}
        keyExtractor={(item) => String(item.id || item._id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                Dr. {item.doctorId?.providerId?.fullName || '—'} · {item.city || item.address || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.stateBtn, { backgroundColor: item.isActive ? '#FEE2E2' : '#DCFCE7' }]}
              onPress={() => handleToggle(item)}
            >
              <Text style={[styles.stateText, { color: item.isActive ? COLORS.danger : COLORS.success }]}>
                {item.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.center}>
              <Ionicons name="business-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>{error || 'No clinics found'}</Text>
              {error && (
                <TouchableOpacity style={styles.retryBtn} onPress={load}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  list: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardBody: { flex: 1, marginRight: 10 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  stateBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  stateText: { fontSize: 12, fontWeight: '700' },
  center: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textLight, marginTop: 10, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
});

export default AdminClinicManagementScreen;
