import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppBar,
  Button,
  Card,
  ErrorState,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonCard,
  TextField,
  showToast,
} from '../../../../components/ui';
import { APP_CURRENCY } from '../../../../constants/Currency';
import { E, GUTTER, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import { ThemeColors, useTheme } from '../../../../theme';
import { contactSupport } from '../../../../utils/support/contactSupport';
import { fetchDoctorProfile, updateDoctorProfile, type DoctorProfileData } from './doctorProfileSlice';

// ============================================================================
// Edit the parts of the profile patients see.
//
// A bottom-sheet modal before: validation ran only on save, as one message at
// the bottom of a scroll the keyboard covered; its text was unreadable in dark
// mode; Android back closed it mid-save. This is a screen with per-field
// errors and a guard against leaving with unsaved edits.
//
// Only fields the server accepts are editable. Name, phone, email and
// specialty are verified with the doctor's registration, so they are shown
// read-only with the way to change them.
// ============================================================================

interface Form {
  bio: string;
  qualification: string;
  experience: string;
  consultationFee: string;
  videoConsultationFee: string;
}

const formFrom = (p: DoctorProfileData): Form => ({
  bio: p.bio || '',
  qualification: p.qualification || '',
  experience: p.experience ? String(p.experience) : '',
  consultationFee: p.consultationFee ? String(p.consultationFee) : '',
  videoConsultationFee: p.videoConsultationFee ? String(p.videoConsultationFee) : '',
});

const MAX_FEE = 100000;

function validate(form: Form): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  const years = Number(form.experience);
  if (form.experience.trim() && (!Number.isInteger(years) || years < 0 || years > 70)) {
    errors.experience = 'Enter whole years, from 0 to 70';
  }
  (['consultationFee', 'videoConsultationFee'] as const).forEach((key) => {
    const value = form[key].trim();
    const amount = Number(value);
    if (value && (!Number.isFinite(amount) || amount < 0 || amount > MAX_FEE)) {
      errors[key] = `Enter an amount from 0 to ${MAX_FEE.toLocaleString()}`;
    }
  });
  if (form.bio.length > 1000) errors.bio = 'Keep your bio under 1,000 characters';
  return errors;
}

const EditDoctorProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const { profile, loading, saving, error } = useAppSelector((s) => s.doctorProfile);
  const [form, setForm] = useState<Form | null>(profile ? formFrom(profile) : null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!profile) dispatch(fetchDoctorProfile());
  }, [dispatch, profile]);

  // Seed the form once the profile arrives; never overwrite edits in progress.
  useEffect(() => {
    if (profile && !form) setForm(formFrom(profile));
  }, [profile, form]);

  const original = useMemo(() => (profile ? formFrom(profile) : null), [profile]);
  const dirty = !!form && !!original && (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== original[k]);
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty);

  const errors = form ? validate(form) : {};
  const shownErrors = submitted ? errors : {};

  const set = (key: keyof Form) => (value: string) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    try {
      await dispatch(
        updateDoctorProfile({
          bio: form.bio.trim(),
          qualification: form.qualification.trim(),
          experience: Number(form.experience) || 0,
          consultationFee: Number(form.consultationFee) || 0,
          videoConsultationFee: Number(form.videoConsultationFee) || 0,
        })
      ).unwrap();
      showToast({ message: 'Profile saved', tone: 'success' });
      allowLeave();
      navigation.goBack();
    } catch (e) {
      showToast({ message: typeof e === 'string' ? e : "We couldn't save your profile", tone: 'error' });
    }
  };

  const body = () => {
    if (!profile || !form) {
      if (error && !loading) return <ErrorState message={error} onRetry={() => dispatch(fetchDoctorProfile())} />;
      return <SkeletonCard lines={5} />;
    }

    return (
      <>
        <SectionHeader title="About you" />
        <TextField
          label="Bio"
          value={form.bio}
          onChangeText={set('bio')}
          placeholder="Your approach, the conditions you treat, languages you speak"
          multiline
          maxLength={1000}
          helper={`${form.bio.length}/1000`}
          error={shownErrors.bio}
        />
        <TextField
          label="Qualifications"
          value={form.qualification}
          onChangeText={set('qualification')}
          placeholder="MBBS, FCPS (Medicine)"
          helper="Separate with commas"
          autoCapitalize="characters"
        />
        <TextField
          label="Years of experience"
          value={form.experience}
          onChangeText={set('experience')}
          keyboardType="number-pad"
          maxLength={2}
          error={shownErrors.experience}
        />

        <SectionHeader title="Fees" style={styles.section} />
        <TextField
          label="In-clinic consultation"
          value={form.consultationFee}
          onChangeText={set('consultationFee')}
          keyboardType="number-pad"
          maxLength={6}
          error={shownErrors.consultationFee}
          right={<Text style={styles.unit}>{APP_CURRENCY}</Text>}
        />
        <TextField
          label="Video consultation"
          value={form.videoConsultationFee}
          onChangeText={set('videoConsultationFee')}
          keyboardType="number-pad"
          maxLength={6}
          error={shownErrors.videoConsultationFee}
          helper="New bookings use the new fee. Existing appointments keep theirs."
          right={<Text style={styles.unit}>{APP_CURRENCY}</Text>}
        />

        <SectionHeader title="Registration details" style={styles.section} />
        <Card>
          <ListRow icon="person-outline" title={profile.fullName || '—'} subtitle="Name" />
          <ListRow icon="medkit-outline" title={profile.specialization || '—'} subtitle="Specialty" divider />
          <ListRow icon="mail-outline" title={profile.email || '—'} subtitle="Email" divider />
          <ListRow icon="call-outline" title={profile.phone || '—'} subtitle="Phone" divider />
          {!!profile.pmcNumber && <ListRow icon="ribbon-outline" title={profile.pmcNumber} subtitle="PMC number" divider />}
        </Card>
        <Text style={styles.note}>
          These are verified with your registration.{' '}
          <Text style={styles.link} onPress={() => contactSupport('Change doctor registration details')}>
            Contact support
          </Text>{' '}
          to change them.
        </Text>
      </>
    );
  };

  return (
    <Screen>
      <AppBar title="Edit profile" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {body()}
        </ScrollView>
        {!!form && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>
            <Button label="Save changes" onPress={save} loading={saving} disabled={!dirty} />
          </View>
        )}
      </KeyboardAvoidingView>
      {sheet}
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: S.huge },
    section: { marginTop: SECTION },
    unit: { ...T.label, color: c.inkMuted, marginLeft: S.sm },
    note: { ...T.caption, color: c.inkMuted, marginTop: S.md },
    link: { color: c.accentDeep },
    footer: {
      paddingHorizontal: GUTTER,
      paddingTop: S.md,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      ...E.overlay,
    },
  });

export default EditDoctorProfileScreen;
