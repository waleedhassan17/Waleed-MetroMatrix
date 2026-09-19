import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { useTheme } from '../../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { fetchMyPrescriptionsApi } from '../../../../networks/healthcare/appointmentApi';
import { downloadAndShareAuthedPdf } from '../../../../utils/healthcare/documents';
import type { Prescription } from '../../../../models/healthcare/types';

const C = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

const MyPrescriptionsScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation<any>();
  // react-native's SafeAreaView is a plain View on Android, so the back button
  // was drawing up against the status bar icons.
  const insets = useSafeAreaInsets();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Which row's PDF is being fetched, so only that icon spins. */
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMyPrescriptionsApi();
    if (res.success) setPrescriptions(res.data);
    else setError(res.message || 'Something went wrong');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // This used to be `Linking.openURL(pdfEndpoint)`. The route is behind
  // `requireUser`, and an external browser carries none of the app's session —
  // so the button left the app and landed on a 401 every time. Fetch it here,
  // with the token, and hand the file to the OS.
  const handleDownload = useCallback(async (prescriptionId: string) => {
    setDownloadingId(prescriptionId);
    try {
      await downloadAndShareAuthedPdf(
        `/v1/healthcare/prescriptions/${encodeURIComponent(prescriptionId)}/pdf`,
        `prescription-${prescriptionId.slice(-8).toUpperCase()}.pdf`,
        'Save prescription'
      );
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'The prescription could not be downloaded.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const renderItem = ({ item }: { item: Prescription }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate(HealthcareRouteNames.PrescriptionView, {
          prescriptionId: item.prescriptionId,
        })
      }
    >
      <View style={styles.cardIcon}>
        <Ionicons name="document-text-outline" size={22} color={C.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.diagnosis} numberOfLines={1}>{item.diagnosis || 'Prescription'}</Text>
        <Text style={styles.meta}>
          {item.medications?.length || 0} medication{(item.medications?.length || 0) === 1 ? '' : 's'}
          {' · '}
          {new Date(item.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.pdfBtn}
        onPress={() => handleDownload(item.prescriptionId)}
        disabled={downloadingId === item.prescriptionId}
        accessibilityRole="button"
        accessibilityLabel={`Download ${item.diagnosis || 'prescription'} as PDF`}
      >
        {downloadingId === item.prescriptionId ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : (
          <Ionicons name="download-outline" size={18} color={C.primary} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerText}>
          <Text style={styles.title}>My Prescriptions</Text>
          {prescriptions.length > 0 && (
            <Text style={styles.subtitle}>
              {prescriptions.length} prescription{prescriptions.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.prescriptionId}
        renderItem={renderItem}
        // Cells are memoised on `item`, which does not change when a row starts
        // downloading — without this the spinner never appears.
        extraData={downloadingId}
        contentContainerStyle={[
          styles.list,
          // Centre the empty state in the space left over instead of pinning
          // it 48pt from the top of a mostly blank screen.
          prescriptions.length === 0 && styles.listEmpty,
        ]}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} />
          ) : error ? (
            <View style={styles.center}>
              <View style={[styles.emptyMedallion, { backgroundColor: sh.ground('#FEF2F2', '#EF4444') }]}>
                <Ionicons name="cloud-offline-outline" size={34} color="#EF4444" />
              </View>
              <Text style={styles.emptyText}>Couldn't load prescriptions</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyMedallion}>
                <Ionicons name="medkit-outline" size={34} color={C.primary} />
              </View>
              <Text style={styles.emptyText}>No prescriptions yet</Text>
              <Text style={styles.emptySub}>
                Prescriptions appear here after a completed consultation.
              </Text>
              {/* A dead end otherwise: the only way to get a prescription is
                  to see a doctor, so offer that rather than leaving the
                  screen with nothing to do. */}
              <TouchableOpacity
                style={styles.retryBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(HealthcareRouteNames.DoctorList)}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.retryText}>Find a Doctor</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: C.textSec, marginTop: 1 },
  list: { padding: 16, paddingBottom: 40 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginHorizontal: 12 },
  diagnosis: { fontSize: 14, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textSec, marginTop: 2 },
  pdfBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: 32 },
  emptyMedallion: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 24,
    paddingHorizontal: 26, paddingVertical: 13,
    marginTop: 22,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  emptySub: { fontSize: 13.5, color: C.textSec, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});

export default MyPrescriptionsScreen;
