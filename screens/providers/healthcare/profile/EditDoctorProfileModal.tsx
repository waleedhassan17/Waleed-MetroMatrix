// ============================================================================
// Edit the doctor's own profile.
//
// The pencil in the profile header had no onPress, and updateDoctorProviderProfileApi
// / the updateDoctorProfile thunk both existed but were called from nowhere — the
// whole data path was built and simply never reached a control. This is the
// missing piece, not new plumbing.
//
// FIELDS: exactly what PATCH /doctors/me accepts and the profile model carries —
// bio (sent as `about`), consultationFee, videoConsultationFee, qualifications
// and experience. The endpoint also accepts briefDescription and city, but
// DoctorProfileData holds neither and the screen shows neither, so they are left
// alone rather than surfaced as fields with nothing behind them.
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { useTheme } from '../../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { DOCTOR_THEME as THEME } from '../../../../constants/DoctorTheme';
import type { DoctorProfileData } from '../../../../models/healthcare/types';

export interface EditDoctorProfileModalProps {
  visible: boolean;
  profile: DoctorProfileData;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (updates: Partial<DoctorProfileData>) => void;
}

type FormState = {
  bio: string;
  qualification: string;
  experience: string;
  consultationFee: string;
  videoConsultationFee: string;
};

const toForm = (p: DoctorProfileData): FormState => ({
  bio: p.bio ?? '',
  qualification: p.qualification ?? '',
  experience: String(p.experience ?? ''),
  consultationFee: String(p.consultationFee ?? ''),
  videoConsultationFee: String(p.videoConsultationFee ?? ''),
});

/** Fees and experience are numbers on the server; reject anything that is not. */
const numberError = (raw: string, label: string): string | null => {
  if (!raw.trim()) return `${label} is required`;
  const value = Number(raw);
  if (!Number.isFinite(value)) return `${label} must be a number`;
  if (value < 0) return `${label} cannot be negative`;
  return null;
};

const EditDoctorProfileModal: React.FC<EditDoctorProfileModalProps> = ({
  visible,
  profile,
  saving,
  error,
  onClose,
  onSave,
}) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const [touched, setTouched] = useState(false);

  // Re-seed whenever the sheet opens, so a cancelled edit does not persist as
  // stale text the next time it is opened.
  useEffect(() => {
    if (visible) {
      setForm(toForm(profile));
      setTouched(false);
    }
  }, [visible, profile]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validation =
    numberError(form.consultationFee, 'Consultation fee') ||
    numberError(form.videoConsultationFee, 'Video consultation fee') ||
    numberError(form.experience, 'Experience') ||
    (form.qualification.trim() ? null : 'Qualifications are required');

  const handleSave = () => {
    setTouched(true);
    if (validation) return;
    onSave({
      bio: form.bio.trim(),
      qualification: form.qualification.trim(),
      experience: Number(form.experience),
      consultationFee: Number(form.consultationFee),
      videoConsultationFee: Number(form.videoConsultationFee),
    });
  };

  const field = (
    label: string,
    key: keyof FormState,
    opts: { multiline?: boolean; keyboardType?: 'numeric'; hint?: string; placeholder?: string } = {}
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, opts.multiline && styles.inputMultiline]}
        value={form[key]}
        onChangeText={set(key)}
        multiline={opts.multiline}
        keyboardType={opts.keyboardType}
        placeholder={opts.placeholder}
        placeholderTextColor={THEME.textLight}
        editable={!saving}
      />
      {!!opts.hint && <Text style={styles.hint}>{opts.hint}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit profile</Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={THEME.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {field('About you', 'bio', {
              multiline: true,
              placeholder: 'A short introduction patients will see',
            })}
            {field('Qualifications', 'qualification', {
              placeholder: 'MBBS, FCPS',
              hint: 'Separate each qualification with a comma.',
            })}
            {field('Experience (years)', 'experience', { keyboardType: 'numeric' })}
            {field('Consultation fee', 'consultationFee', {
              keyboardType: 'numeric',
              hint: `In ${profile.currency || 'PKR'}, for an in-clinic visit.`,
            })}
            {field('Video consultation fee', 'videoConsultationFee', {
              keyboardType: 'numeric',
              hint: 'Charged for online consultations.',
            })}

            {/* Local validation first, then whatever the server said. */}
            {(touched && validation) || error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={THEME.error} />
                <Text style={styles.errorText}>{(touched && validation) || error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.saveText}>Save changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  title: { fontSize: 17, fontWeight: '700', color: THEME.textDark },
  body: { paddingHorizontal: 20 },
  bodyContent: { paddingTop: 16, paddingBottom: 8 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: THEME.textDark, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: THEME.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: THEME.textDark,
    backgroundColor: THEME.pageBg,
  },
  inputMultiline: { height: 96, textAlignVertical: 'top', paddingTop: 11 },
  hint: { fontSize: 11.5, color: THEME.textLight, marginTop: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: sh.ground('#FEF2F2', '#EF4444'),
    borderRadius: 10,
    padding: 11,
    marginBottom: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: THEME.error },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: sh.n('#FFFFFF', 'inkInverse'), fontSize: 15, fontWeight: '700' },
});

export default EditDoctorProfileModal;
