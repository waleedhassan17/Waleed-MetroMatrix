import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import {
  checkSymptomsApi,
  type SymptomCheckResult,
} from '../../../../networks/healthcare/appointmentApi';

const C = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  warn: '#F59E0B',
  warnBg: '#FEF3C7',
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#E5EAF2',
  text: '#1A1A1A',
  textSec: '#64748B',
};

const SymptomCheckerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [symptoms, setSymptoms] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SymptomCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (symptoms.trim().length < 5) {
      setError('Please describe your symptoms in a few words.');
      return;
    }
    setChecking(true);
    setError(null);
    setResult(null);
    const res = await checkSymptomsApi(symptoms.trim());
    setChecking(false);
    if (res.success) setResult(res.data);
    else setError(res.message || 'Something went wrong');
  };

  const handleFindDoctor = () => {
    if (!result) return;
    navigation.navigate(HealthcareRouteNames.DoctorList, {
      specialtyId: result.recommendedSpecialty.specialtyId || '',
      specialtyName: result.recommendedSpecialty.name,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Symptom Checker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <MaterialCommunityIcons name="stethoscope" size={28} color={C.primary} />
          <Text style={styles.introText}>
            Describe how you're feeling and we'll suggest which kind of specialist to see.
            This is guidance only — it is never a diagnosis.
          </Text>
        </View>

        <Text style={styles.label}>Your symptoms</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="e.g. I've had a dry cough and mild fever for three days, and my chest feels tight when I climb stairs…"
          placeholderTextColor={C.textSec}
          value={symptoms}
          onChangeText={setSymptoms}
        />

        <TouchableOpacity
          style={[styles.checkBtn, checking && { opacity: 0.6 }]}
          disabled={checking}
          onPress={handleCheck}
        >
          {checking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.checkText}>Check Symptoms</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {result && (
          <>
            <View style={styles.disclaimerBox}>
              <Ionicons name="warning-outline" size={18} color={C.warn} />
              <Text style={styles.disclaimerText}>{result.disclaimer}</Text>
            </View>

            <Text style={styles.sectionTitle}>Possible areas to discuss with a doctor</Text>
            {result.conditions.map((condition, index) => (
              <View key={index} style={styles.conditionCard}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.conditionName}>{condition.condition}</Text>
                  <Text style={styles.confidence}>{condition.confidence}%</Text>
                </View>
                <View style={styles.confidenceTrack}>
                  <View style={[styles.confidenceFill, { width: `${condition.confidence}%` }]} />
                </View>
                {condition.matchedSymptoms && condition.matchedSymptoms.length > 0 && (
                  <Text style={styles.matched}>Matched: {condition.matchedSymptoms.join(', ')}</Text>
                )}
              </View>
            ))}

            <View style={styles.recommendCard}>
              <Text style={styles.recommendLabel}>Recommended specialist</Text>
              <Text style={styles.recommendName}>{result.recommendedSpecialty.name}</Text>
              <TouchableOpacity style={styles.findBtn} onPress={handleFindDoctor}>
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.findText}>Find a {result.recommendedSpecialty.name} doctor</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },
  introCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.primaryLight, borderRadius: 14, padding: 14, marginBottom: 16 },
  introText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 6 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, minHeight: 110, textAlignVertical: 'top', fontSize: 14, color: C.text },
  checkBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  checkText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#EF4444', marginTop: 10, textAlign: 'center' },
  disclaimerBox: { flexDirection: 'row', gap: 8, backgroundColor: C.warnBg, borderRadius: 12, padding: 12, marginTop: 18, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 18, marginBottom: 8 },
  conditionCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  conditionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  conditionName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  confidence: { fontSize: 14, fontWeight: '800', color: C.primary },
  confidenceTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  confidenceFill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  matched: { fontSize: 12, color: C.textSec, marginTop: 6 },
  recommendCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: C.primary, alignItems: 'center' },
  recommendLabel: { fontSize: 12, color: C.textSec },
  recommendName: { fontSize: 18, fontWeight: '800', color: C.text, marginVertical: 6 },
  findBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 6 },
  findText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

export default SymptomCheckerScreen;
