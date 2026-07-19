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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { fetchMyPatientsApi } from '../../../../networks/healthcare/providerApi';

const C = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

type PatientRow = { patientId: string; name: string; lastVisit: string; appointmentCount: number };

const DoctorPatientsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMyPatientsApi();
    if (res.success) setPatients(res.data);
    else setError(res.message || 'Something went wrong');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search.trim()
    ? patients.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : patients;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Patients</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={C.textSec} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients…"
          placeholderTextColor={C.textSec}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.patientId}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate(DoctorRouteNames.PatientHistory, { patientId: item.patientId })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.appointmentCount} visit{item.appointmentCount === 1 ? '' : 's'}
                {item.lastVisit
                  ? ` · last ${new Date(item.lastVisit).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}`
                  : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textSec} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={44} color={C.textSec} />
              <Text style={styles.emptyText}>
                {search ? 'No patients match your search' : 'Patients appear here after their first appointment'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.text },
  list: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.primary },
  cardBody: { flex: 1, marginHorizontal: 12 },
  name: { fontSize: 14, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textSec, marginTop: 2 },
  center: { alignItems: 'center', marginTop: 40, paddingHorizontal: 32 },
  errorText: { color: C.textSec, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: C.textSec, marginTop: 10, textAlign: 'center' },
});

export default DoctorPatientsScreen;
