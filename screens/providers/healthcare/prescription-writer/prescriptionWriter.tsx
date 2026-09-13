import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppBar,
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  FormSheet,
  Screen,
  SectionHeader,
  TextField,
  showToast,
} from '../../../../components/ui';
import { E, GUTTER, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import type { Medication } from '../../../../models/healthcare/types';
import { ThemeColors, useTheme } from '../../../../theme';
import { consultationLabel } from '../../../../utils/healthcare/doctorFormat';
import { addDaysToKey, todayDateKey } from '../../../../utils/healthcare/timeRanges';
import {
  addMedication,
  addSymptom,
  addTest,
  clearPrescription,
  DIAGNOSIS_SUGGESTIONS,
  removeMedication,
  removeSymptom,
  removeTest,
  savePrescription,
  setAdvice,
  setDiagnosis,
  setFollowUpDate,
  setPatient,
} from './prescriptionWriterSlice';

// ============================================================================
// Write a prescription for a completed appointment.
//
// The form's section card, tag input and tag were components declared INSIDE
// this screen's render, so every keystroke created new component types and
// remounted the inputs — the keyboard dropped mid-word. Opened without a
// patient (the old dashboard tile) it showed an error and bounced back. The
// header icon beside the title wiped the whole form without asking.
// ============================================================================

const FREQUENCIES = ['Once a day', 'Twice a day', 'Three times a day', 'Every 8 hours', 'At bedtime', 'As needed'];

const EMPTY_MED: Medication = { name: '', dosage: '', frequency: '', duration: '', instructions: '' };

/** A short list of values added one at a time — symptoms, tests. */
const TagInput: React.FC<{
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}> = ({ label, placeholder, values, onAdd, onRemove }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState('');

  const add = () => {
    if (text.trim()) onAdd(text.trim());
    setText('');
  };

  return (
    <View>
      <TextField
        label={label}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        returnKeyType="done"
        onSubmitEditing={add}
        blurOnSubmit={false}
        maxLength={80}
        containerStyle={styles.tagField}
        right={
          text.trim() ? (
            <TouchableOpacity onPress={add} accessibilityRole="button" accessibilityLabel={`Add to ${label}`}>
              <Ionicons name="add-circle" size={22} color={colors.accentDeep} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      {values.length > 0 && (
        <View style={styles.chips}>
          {values.map((v) => (
            <Chip key={v} label={v} icon="close" selected onPress={() => onRemove(v)} style={styles.chip} />
          ))}
        </View>
      )}
    </View>
  );
};

const PrescriptionWriterScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const params = route.params || {};

  const rx = useAppSelector((s) => s.prescriptionWriter);
  const [submitted, setSubmitted] = useState(false);
  const [medOpen, setMedOpen] = useState(false);
  const [med, setMed] = useState<Medication>(EMPTY_MED);
  const [medSubmitted, setMedSubmitted] = useState(false);

  const hasPatient = !!params.patientId && !!params.appointmentId;

  useEffect(() => {
    if (hasPatient) {
      dispatch(
        setPatient({
          patientId: params.patientId,
          patientName: params.patientName || 'Patient',
          appointmentId: params.appointmentId,
          type: params.type === 'video' ? 'video' : 'in-clinic',
          age: typeof params.age === 'number' ? params.age : 0,
          gender: params.gender === 'Male' || params.gender === 'Female' ? params.gender : 'Other',
        })
      );
    }
    return () => {
      dispatch(clearPrescription());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, hasPatient]);

  const dirty =
    !!rx.diagnosis.trim() ||
    rx.symptoms.length > 0 ||
    rx.medications.length > 0 ||
    rx.tests.length > 0 ||
    !!rx.advice.trim() ||
    !!rx.followUpDate;
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty, { message: "This prescription hasn't been sent." });

  const diagnosisError = submitted && !rx.diagnosis.trim() ? 'Enter a diagnosis' : null;
  const medsError = submitted && rx.medications.length === 0 ? 'Add at least one medication' : null;

  const medErrors = {
    name: medSubmitted && !med.name.trim() ? 'Enter the medicine' : null,
    dosage: medSubmitted && !med.dosage.trim() ? 'Enter the dose, e.g. 500 mg' : null,
    frequency: medSubmitted && !med.frequency.trim() ? 'Choose how often' : null,
  };

  const saveMed = () => {
    setMedSubmitted(true);
    if (!med.name.trim() || !med.dosage.trim() || !med.frequency.trim()) return;
    dispatch(
      addMedication({
        name: med.name.trim(),
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        duration: med.duration.trim(),
        instructions: med.instructions.trim(),
      })
    );
    setMedOpen(false);
  };

  const send = async () => {
    setSubmitted(true);
    if (!rx.diagnosis.trim() || rx.medications.length === 0 || rx.saving) return;
    try {
      await dispatch(savePrescription()).unwrap();
      allowLeave();
      showToast({ message: `Prescription sent to ${rx.patient?.patientName || 'the patient'}`, tone: 'success' });
      navigation.goBack();
    } catch (e) {
      showToast({ message: typeof e === 'string' ? e : "We couldn't send this prescription", tone: 'error' });
    }
  };

  if (!hasPatient) {
    return (
      <Screen>
        <AppBar title="Prescription" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="medkit-outline"
          title="Choose an appointment first"
          message="Prescriptions are written from a completed appointment, so they reach the right patient."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const query = rx.diagnosis.trim().toLowerCase();
  const suggestions = DIAGNOSIS_SUGGESTIONS.filter(
    (d) => d.toLowerCase() !== query && (!query || d.toLowerCase().includes(query))
  ).slice(0, 6);
  const details = [
    params.patientName,
    typeof params.age === 'number' && params.age > 0 ? `${params.age} yrs` : '',
    params.gender && params.gender !== 'Other' ? params.gender : '',
  ].filter(Boolean);

  return (
    <Screen>
      <AppBar title="Prescription" subtitle={details.join(' · ')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.caption}>{consultationLabel(params.type)} consultation</Text>

          <SectionHeader title="Diagnosis" style={styles.sectionTight} />
          <TextField
            value={rx.diagnosis}
            onChangeText={(t) => dispatch(setDiagnosis(t))}
            placeholder="e.g. Upper respiratory infection"
            error={diagnosisError}
            maxLength={200}
          />
          {suggestions.length > 0 && (
            <View style={styles.chips}>
              {suggestions.map((d) => (
                <Chip key={d} label={d} onPress={() => dispatch(setDiagnosis(d))} style={styles.chip} />
              ))}
            </View>
          )}

          <TagInput
            label="Symptoms"
            placeholder="Add a symptom"
            values={rx.symptoms}
            onAdd={(v) => dispatch(addSymptom(v))}
            onRemove={(v) => dispatch(removeSymptom(v))}
          />

          <SectionHeader
            title="Medications"
            actionLabel="Add"
            onAction={() => {
              setMed(EMPTY_MED);
              setMedSubmitted(false);
              setMedOpen(true);
            }}
            style={styles.section}
          />
          {rx.medications.length === 0 ? (
            <Card>
              <Text style={styles.body}>No medications added.</Text>
              <Button
                label="Add medication"
                icon="add"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setMed(EMPTY_MED);
                  setMedSubmitted(false);
                  setMedOpen(true);
                }}
                style={styles.inlineButton}
              />
            </Card>
          ) : (
            <Card padded={false} style={styles.listCard}>
              {rx.medications.map((m, i) => (
                <View key={`${m.name}-${i}`} style={[styles.medRow, i > 0 && styles.divider]}>
                  <View style={styles.flex}>
                    <Text style={styles.strong}>{m.name}</Text>
                    <Text style={styles.caption}>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</Text>
                    {!!m.instructions && <Text style={styles.caption}>{m.instructions}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => dispatch(removeMedication(i))}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${m.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.inkMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}
          {!!medsError && <Text style={styles.error}>{medsError}</Text>}

          <View style={styles.section}>
            <TagInput
              label="Tests"
              placeholder="Add a test, e.g. CBC"
              values={rx.tests}
              onAdd={(v) => dispatch(addTest(v))}
              onRemove={(v) => dispatch(removeTest(v))}
            />
          </View>

          <TextField
            label="Advice"
            value={rx.advice}
            onChangeText={(t) => dispatch(setAdvice(t))}
            placeholder="Rest, fluids, diet, when to come back sooner"
            multiline
            maxLength={1000}
          />

          <DateField
            label="Follow-up (optional)"
            value={rx.followUpDate}
            min={addDaysToKey(todayDateKey(), 1)}
            onChange={(v) => dispatch(setFollowUpDate(v))}
          />
          {!!rx.followUpDate && (
            <Button
              label="Remove follow-up"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => dispatch(setFollowUpDate(''))}
              style={styles.inlineButton}
            />
          )}
          <View style={styles.bottomSpace} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>
          <Button label="Send prescription" icon="send-outline" onPress={send} loading={rx.saving} />
        </View>
      </KeyboardAvoidingView>

      <FormSheet
        visible={medOpen}
        title="Add medication"
        onClose={() => setMedOpen(false)}
        footer={<Button label="Add to prescription" onPress={saveMed} />}
      >
        <TextField label="Medicine" value={med.name} onChangeText={(name) => setMed({ ...med, name })} placeholder="e.g. Amoxicillin" error={medErrors.name} maxLength={80} />
        <TextField label="Dose" value={med.dosage} onChangeText={(dosage) => setMed({ ...med, dosage })} placeholder="e.g. 500 mg" error={medErrors.dosage} maxLength={40} />
        <Text style={styles.label}>How often</Text>
        <View style={styles.chips}>
          {FREQUENCIES.map((f) => (
            <Chip key={f} label={f} selected={med.frequency === f} onPress={() => setMed({ ...med, frequency: f })} style={styles.chip} />
          ))}
        </View>
        <TextField
          value={FREQUENCIES.includes(med.frequency) ? '' : med.frequency}
          onChangeText={(frequency) => setMed({ ...med, frequency })}
          placeholder="Or write your own"
          error={medErrors.frequency}
          maxLength={60}
        />
        <TextField label="For how long" value={med.duration} onChangeText={(duration) => setMed({ ...med, duration })} placeholder="e.g. 5 days" maxLength={40} />
        <TextField
          label="Instructions"
          value={med.instructions}
          onChangeText={(instructions) => setMed({ ...med, instructions })}
          placeholder="e.g. After meals"
          maxLength={200}
        />
      </FormSheet>
      {sheet}
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.md },
    section: { marginTop: SECTION },
    sectionTight: { marginTop: S.md },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    body: { ...T.body, color: c.inkMuted },
    strong: { ...T.bodyStrong, color: c.ink },
    error: { ...T.caption, color: c.error, marginTop: S.xs },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: S.md },
    chip: { marginRight: S.sm, marginBottom: S.sm },
    tagField: { marginBottom: S.sm },
    inlineButton: { marginTop: S.md, alignSelf: 'flex-start' },
    listCard: { paddingHorizontal: S.lg },
    medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: S.md,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      ...E.overlay,
    },
    bottomSpace: { height: S.huge * 2 },
  });

export default PrescriptionWriterScreen;
