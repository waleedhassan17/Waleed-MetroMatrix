import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  setPatient,
  setDiagnosis,
  addSymptom,
  removeSymptom,
  addMedication,
  removeMedication,
  addTest,
  removeTest,
  setAdvice,
  setFollowUpDate,
  savePrescription,
  clearPrescription,
  DIAGNOSIS_SUGGESTIONS,
  PrescriptionPatient,
} from './prescriptionWriterSlice';
import { Medication } from '../../../../models/healthcare/types';

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    success: ['#10B981', '#059669'] as [string, string],
    secondary: ['#5A9FFF', '#1E6AE1'] as [string, string],
  },
};

// ── Constants ─────────────────────────────────

const DUMMY_PATIENT: PrescriptionPatient = {
  patientId: 'pat-001',
  patientName: 'Ahmed Khan',
  age: 34,
  gender: 'Male',
  appointmentId: 'apt-001',
  type: 'in-clinic',
};

const EMPTY_MED: Medication = {
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
};

// Tag color per section
const SECTION_COLORS = {
  symptoms: '#EF4444',
  tests: THEME.primary,
};

// ── Component ─────────────────────────────────

const PrescriptionWriterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const {
    patient,
    diagnosis,
    symptoms,
    medications,
    tests,
    advice,
    followUpDate,
    saving,
    saveSuccess,
    error,
  } = useAppSelector((s) => s.prescriptionWriter);

  const [symptomInput, setSymptomInput] = useState('');
  const [testInput, setTestInput] = useState('');
  const [medForm, setMedForm] = useState<Medication>({ ...EMPTY_MED });
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const sectionAnims = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const patientParam = route.params?.patient as PrescriptionPatient | undefined;
    dispatch(setPatient(patientParam ?? DUMMY_PATIENT));

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.stagger(
        80,
        sectionAnims.map((a) =>
          Animated.spring(a, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        )
      ),
    ]).start();

    return () => { dispatch(clearPrescription()); };
  }, [dispatch, route.params]);

  // Success banner animation
  useEffect(() => {
    if (saveSuccess) {
      Animated.spring(successAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
    }
  }, [saveSuccess]);

  // ── Handlers ──────────────────────────────

  const handleAddSymptom = useCallback(() => {
    if (symptomInput.trim()) {
      dispatch(addSymptom(symptomInput.trim()));
      setSymptomInput('');
    }
  }, [symptomInput, dispatch]);

  const handleAddMedication = useCallback(() => {
    if (!medForm.name.trim()) { Alert.alert('Required', 'Medication name is required'); return; }
    if (!medForm.dosage.trim()) { Alert.alert('Required', 'Dosage is required'); return; }
    if (!medForm.frequency.trim()) { Alert.alert('Required', 'Frequency is required'); return; }
    dispatch(addMedication(medForm));
    setMedForm({ ...EMPTY_MED });
  }, [medForm, dispatch]);

  const handleAddTest = useCallback(() => {
    if (testInput.trim()) {
      dispatch(addTest(testInput.trim()));
      setTestInput('');
    }
  }, [testInput, dispatch]);

  const handleSave = useCallback(() => {
    dispatch(savePrescription());
  }, [dispatch]);

  const filteredSuggestions = diagnosis.length >= 2
    ? DIAGNOSIS_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(diagnosis.toLowerCase())
      ).slice(0, 5)
    : [];

  const isValid = diagnosis.trim() && medications.length > 0;

  // ── Section card wrapper ───────────────────

  const SectionCard: React.FC<{
    title: string;
    iconName: string;
    iconLib?: 'ion' | 'mci';
    accentColor?: string;
    animIndex: number;
    children: React.ReactNode;
    badge?: number;
  }> = ({ title, iconName, iconLib = 'ion', accentColor = THEME.primary, animIndex, children, badge }) => {
    const a = sectionAnims[animIndex];
    return (
      <Animated.View
        style={{
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          marginBottom: 14,
        }}
      >
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={[styles.cardLabelIcon, { backgroundColor: `${accentColor}18` }]}>
              {iconLib === 'mci' ? (
                <MaterialCommunityIcons name={iconName as any} size={15} color={accentColor} />
              ) : (
                <Ionicons name={iconName as any} size={15} color={accentColor} />
              )}
            </View>
            <Text style={styles.cardLabel}>{title}</Text>
            {badge !== undefined && badge > 0 && (
              <View style={[styles.cardBadge, { backgroundColor: `${accentColor}18` }]}>
                <Text style={[styles.cardBadgeText, { color: accentColor }]}>{badge}</Text>
              </View>
            )}
          </View>
          {children}
        </View>
      </Animated.View>
    );
  };

  // ── Input Row ──────────────────────────────

  const InputWithAdd: React.FC<{
    value: string;
    onChange: (t: string) => void;
    onAdd: () => void;
    placeholder: string;
    accentColor?: string;
  }> = ({ value, onChange, onAdd, placeholder, accentColor = THEME.primary }) => (
    <View style={styles.inputRow}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.rowInput}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
      </View>
      <TouchableOpacity style={styles.addIconBtn} onPress={onAdd} activeOpacity={0.85}>
        <LinearGradient
          colors={[accentColor, accentColor]}
          style={styles.addIconBtnGradient}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ── Tag chip ───────────────────────────────

  const Tag: React.FC<{ label: string; color: string; onRemove: () => void }> = ({
    label, color, onRemove,
  }) => (
    <View style={[styles.tagChip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={15} color={color} />
      </TouchableOpacity>
    </View>
  );

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Write Prescription</Text>
            <Text style={styles.headerSubtitle}>
              {medications.length} med{medications.length !== 1 ? 's' : ''} · {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => dispatch(clearPrescription())}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Patient Card ── */}
          {patient && (
            <Animated.View
              style={{
                opacity: sectionAnims[0],
                transform: [{ translateY: sectionAnims[0].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                marginBottom: 14,
              }}
            >
              <View style={styles.patientCard}>
                <LinearGradient colors={THEME.gradient.primary} style={styles.patientAvatar}>
                  <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.patientName}</Text>
                  <Text style={styles.patientMeta}>
                    {patient.age} yrs  ·  {patient.gender}
                  </Text>
                  <Text style={styles.patientAppt}>Appt: {patient.appointmentId}</Text>
                </View>
                <View style={[
                  styles.patientTypeChip,
                  { backgroundColor: patient.type === 'video' ? '#EAF3FF' : THEME.primaryLight },
                ]}>
                  <Ionicons
                    name={patient.type === 'video' ? 'videocam-outline' : 'business-outline'}
                    size={13}
                    color={patient.type === 'video' ? THEME.accent : THEME.primary}
                  />
                  <Text style={[styles.patientTypeText, {
                    color: patient.type === 'video' ? THEME.accent : THEME.primary,
                  }]}>
                    {patient.type === 'video' ? 'Video' : 'In-Clinic'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── Symptoms ── */}
          <SectionCard
            title="Symptoms"
            iconName="bandage-outline"
            accentColor="#EF4444"
            animIndex={1}
            badge={symptoms.length}
          >
            <InputWithAdd
              value={symptomInput}
              onChange={setSymptomInput}
              onAdd={handleAddSymptom}
              placeholder="e.g. Headache, Fever…"
              accentColor="#EF4444"
            />
            {symptoms.length > 0 && (
              <View style={styles.tagsWrap}>
                {symptoms.map((s) => (
                  <Tag key={s} label={s} color="#EF4444" onRemove={() => dispatch(removeSymptom(s))} />
                ))}
              </View>
            )}
          </SectionCard>

          {/* ── Diagnosis ── */}
          <SectionCard
            title="Diagnosis *"
            iconName="stethoscope"
            iconLib="mci"
            accentColor={THEME.primary}
            animIndex={2}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type diagnosis…"
                placeholderTextColor="#CBD5E1"
                value={diagnosis}
                onChangeText={(text) => {
                  dispatch(setDiagnosis(text));
                  setShowDiagnosisSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowDiagnosisSuggestions(false), 200)}
              />
            </View>

            {/* Autocomplete */}
            {showDiagnosisSuggestions && filteredSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {filteredSuggestions.map((s, i) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.suggestionItem,
                      i < filteredSuggestions.length - 1 && styles.suggestionBorder,
                    ]}
                    onPress={() => {
                      dispatch(setDiagnosis(s));
                      setShowDiagnosisSuggestions(false);
                    }}
                  >
                    <Ionicons name="search-outline" size={13} color="#94A3B8" />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SectionCard>

          {/* ── Medications ── */}
          <SectionCard
            title="Medications *"
            iconName="pill"
            iconLib="mci"
            accentColor={THEME.accent}
            animIndex={3}
            badge={medications.length}
          >
            {/* Existing medications */}
            {medications.length > 0 && (
              <View style={styles.medList}>
                {medications.map((med, idx) => (
                  <View key={`${med.name}-${idx}`} style={styles.medCard}>
                    <LinearGradient
                      colors={THEME.gradient.secondary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.medStripe}
                    />
                    <View style={styles.medCardBody}>
                      <View style={styles.medCardHeader}>
                        <View style={styles.medIconWrap}>
                          <MaterialCommunityIcons name="pill" size={14} color={THEME.accent} />
                        </View>
                        <Text style={styles.medName}>{med.name}</Text>
                        <TouchableOpacity
                          style={styles.medDeleteBtn}
                          onPress={() => dispatch(removeMedication(idx))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={THEME.error} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.medTagRow}>
                        <View style={[styles.medInfoChip, { backgroundColor: '#F0F7FF' }]}>
                          <MaterialCommunityIcons name="flask-outline" size={10} color={THEME.primary} />
                          <Text style={[styles.medInfoText, { color: THEME.primary }]}>{med.dosage}</Text>
                        </View>
                        <View style={[styles.medInfoChip, { backgroundColor: '#F0FDF4' }]}>
                          <Ionicons name="time-outline" size={10} color={THEME.success} />
                          <Text style={[styles.medInfoText, { color: THEME.success }]}>{med.frequency}</Text>
                        </View>
                        {med.duration ? (
                          <View style={[styles.medInfoChip, { backgroundColor: '#FFFBEB' }]}>
                            <MaterialCommunityIcons name="timer-outline" size={10} color={THEME.warning} />
                            <Text style={[styles.medInfoText, { color: THEME.warning }]}>{med.duration}</Text>
                          </View>
                        ) : null}
                      </View>
                      {med.instructions ? (
                        <Text style={styles.medInstructions}>{med.instructions}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Add medication form */}
            <View style={styles.medFormCard}>
              <Text style={styles.medFormTitle}>Add Medication</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Medicine name *"
                  placeholderTextColor="#CBD5E1"
                  value={medForm.name}
                  onChangeText={(t) => setMedForm((p) => ({ ...p, name: t }))}
                />
              </View>
              <View style={styles.twoCol}>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Dosage *"
                    placeholderTextColor="#CBD5E1"
                    value={medForm.dosage}
                    onChangeText={(t) => setMedForm((p) => ({ ...p, dosage: t }))}
                  />
                </View>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Frequency *"
                    placeholderTextColor="#CBD5E1"
                    value={medForm.frequency}
                    onChangeText={(t) => setMedForm((p) => ({ ...p, frequency: t }))}
                  />
                </View>
              </View>
              <View style={styles.twoCol}>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Duration"
                    placeholderTextColor="#CBD5E1"
                    value={medForm.duration}
                    onChangeText={(t) => setMedForm((p) => ({ ...p, duration: t }))}
                  />
                </View>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Instructions"
                    placeholderTextColor="#CBD5E1"
                    value={medForm.instructions}
                    onChangeText={(t) => setMedForm((p) => ({ ...p, instructions: t }))}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.addMedBtn} onPress={handleAddMedication} activeOpacity={0.85}>
                <LinearGradient
                  colors={THEME.gradient.secondary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addMedBtnGradient}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.addMedBtnText}>Add Medication</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SectionCard>

          {/* ── Lab Tests ── */}
          <SectionCard
            title="Lab Tests"
            iconName="flask-outline"
            accentColor={THEME.success}
            animIndex={4}
            badge={tests.length}
          >
            <InputWithAdd
              value={testInput}
              onChange={setTestInput}
              onAdd={handleAddTest}
              placeholder="e.g. CBC, HbA1c…"
              accentColor={THEME.success}
            />
            {tests.length > 0 && (
              <View style={styles.tagsWrap}>
                {tests.map((t) => (
                  <Tag key={t} label={t} color={THEME.success} onRemove={() => dispatch(removeTest(t))} />
                ))}
              </View>
            )}
          </SectionCard>

          {/* ── Advice ── */}
          <SectionCard
            title="Special Instructions / Advice"
            iconName="information-circle-outline"
            accentColor={THEME.warning}
            animIndex={5}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Dietary advice, precautions, lifestyle changes…"
                placeholderTextColor="#CBD5E1"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={advice}
                onChangeText={(t) => dispatch(setAdvice(t))}
              />
            </View>
          </SectionCard>

          {/* ── Follow-Up ── */}
          <SectionCard
            title="Follow-Up Date"
            iconName="calendar-outline"
            accentColor={THEME.primary}
            animIndex={5}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#CBD5E1"
                value={followUpDate}
                onChangeText={(t) => dispatch(setFollowUpDate(t))}
              />
            </View>
          </SectionCard>

          {/* Error / Success */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={THEME.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {saveSuccess ? (
            <Animated.View
              style={[
                styles.successBanner,
                {
                  opacity: successAnim,
                  transform: [{ translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                },
              ]}
            >
              <LinearGradient colors={THEME.gradient.success} style={styles.successBannerGradient}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.successText}>Prescription saved successfully!</Text>
              </LinearGradient>
            </Animated.View>
          ) : null}

          <View style={{ height: 120 }} />
        </Animated.ScrollView>

        {/* ── Bottom Save Bar ── */}
        <View style={styles.bottomBar}>
          {/* Summary */}
          <View style={styles.bottomSummaryRow}>
            <Text style={styles.bottomSummaryText}>
              {medications.length === 0 ? 'Add at least 1 medication' : `${medications.length} medication${medications.length !== 1 ? 's' : ''}`}
            </Text>
            {!diagnosis.trim() && (
              <Text style={styles.bottomSummaryText}> · Diagnosis required</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || !isValid}
            activeOpacity={0.85}
          >
            {isValid ? (
              <LinearGradient
                colors={THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Prescription</Text>
                  </>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.saveBtnGradient}>
                <Ionicons name="checkmark-done" size={20} color="#94A3B8" />
                <Text style={[styles.saveBtnText, { color: '#94A3B8' }]}>Complete form to save</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PrescriptionWriterScreen;

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  flex: { flex: 1 },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 14,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Patient card
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: { flex: 1, gap: 2 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  patientMeta: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  patientAppt: { fontSize: 11, fontWeight: '500', color: '#94A3B8' },
  patientTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  patientTypeText: { fontSize: 11, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardLabelIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  cardBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadgeText: { fontSize: 11, fontWeight: '800' },

  // Input
  inputWrapper: {},
  inputRow: { flexDirection: 'row', gap: 8 },
  rowInput: {
    flex: 1,
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  textInput: {
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addIconBtn: { borderRadius: 12, overflow: 'hidden' },
  addIconBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: '700' },

  // Diagnosis autocomplete
  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionText: { fontSize: 14, fontWeight: '500', color: '#0F172A' },

  // Medications
  medList: { gap: 8, marginBottom: 14 },
  medCard: {
    flexDirection: 'row',
    backgroundColor: '#FAFBFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6E8FF',
  },
  medStripe: { width: 4 },
  medCardBody: { flex: 1, padding: 12, gap: 7 },
  medCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medName: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  medDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  medInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  medInfoText: { fontSize: 11, fontWeight: '700' },
  medInstructions: { fontSize: 12, fontWeight: '500', color: '#64748B', lineHeight: 16 },

  // Med form
  medFormCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medFormTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addMedBtn: { borderRadius: 13, overflow: 'hidden', marginTop: 4 },
  addMedBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  addMedBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Banners
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, fontWeight: '600', color: THEME.error, flex: 1 },
  successBanner: { marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  successBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  successText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Bottom bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  bottomSummaryRow: { flexDirection: 'row', justifyContent: 'center' },
  bottomSummaryText: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  saveBtn: { borderRadius: 10, overflow: 'hidden' },
  saveBtnDisabled: { backgroundColor: '#F1F5F9' },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
});