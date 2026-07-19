import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import { fetchMyPrescriptionsApi } from '../../../../networks/healthcare/appointmentApi';
import { API_URL } from '../../../../networks/network/network';
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
  const navigation = useNavigation<any>();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownload = (prescriptionId: string) => {
    // The PDF endpoint requires the auth token; opening in the browser works
    // for demo purposes because the endpoint accepts the bearer session —
    // in-app viewing goes through PrescriptionView.
    Linking.openURL(`${API_URL}/v1/healthcare/prescriptions/${prescriptionId}/pdf`);
  };

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
      <TouchableOpacity style={styles.pdfBtn} onPress={() => handleDownload(item.prescriptionId)}>
        <Ionicons name="download-outline" size={18} color={C.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Prescriptions</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.prescriptionId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 48 }} />
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="medkit-outline" size={44} color={C.textSec} />
              <Text style={styles.emptyText}>No prescriptions yet</Text>
              <Text style={styles.emptySub}>Prescriptions appear here after a completed consultation.</Text>
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
  list: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginHorizontal: 12 },
  diagnosis: { fontSize: 14, fontWeight: '700', color: C.text },
  meta: { fontSize: 12, color: C.textSec, marginTop: 2 },
  pdfBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', marginTop: 48, paddingHorizontal: 32 },
  errorText: { color: C.textSec, textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 10 },
  emptySub: { fontSize: 13, color: C.textSec, textAlign: 'center', marginTop: 4 },
});

export default MyPrescriptionsScreen;
