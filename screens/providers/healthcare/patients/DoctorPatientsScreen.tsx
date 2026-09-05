import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { useTheme } from '../../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useNavigation } from '@react-navigation/native';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { fetchMyPatientsApi } from '../../../../networks/healthcare/providerApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  // react-native's SafeAreaView is a plain View on Android, so the back
  // button was drawing against the status-bar icons.
  const insets = useSafeAreaInsets();
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
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={() => navigation.goBack()} />
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
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
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
              <View style={[styles.medallion, styles.medallionError]}>
                <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
              </View>
              <Text style={styles.emptyTitle}>Couldn't load</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.medallion}>
                <Ionicons name="people-outline" size={34} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'No matches' : 'No patients yet'}
              </Text>
              <Text style={styles.emptySub}>
                {search
                  ? `Nothing matches "${search}". Try a different name.`
                  : 'A patient appears here once they have had their first appointment with you.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({

  // Shared doctor-screen chrome: safe-area header + a centred empty state.
  headerText: { flex: 1, alignItems: 'center' },
  subtitle: { fontSize: 12, color: C.textSec, marginTop: 1 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  medallion: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  medallionError: { backgroundColor: sh.ground('#FEF2F2', '#EF4444') },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  emptySub: { fontSize: 13.5, color: C.textSec, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 24 },
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
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
