// ============================================================================
// Provider "Edit Profile".
//
// The Account list on the provider profile linked here, except the link did
// nothing and this screen did not exist. The slice thunk (updateProfile) and
// the endpoint (PATCH /provider/profile) were both already in place — only the
// screen was missing.
//
// The four text fields go through updateProfile (name, phone, bio, location).
// The photo uploads straight to Cloudinary with a signature from our API
// (services/uploads/cloudinaryUpload.ts), then PATCH /provider/profile
// { photoUrl } — the server only accepts this provider's own upload.
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../store/store';
import { updateProfile, fetchProfile } from '../profile-screen/profileSlice';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeFlatProviderTheme, type FlatProviderTheme } from '../providerTheme';
import { AppBar, Avatar, Screen } from '../../../../components/ui';
import { uploadAsset } from '../../../../services/uploads/cloudinaryUpload';
import { updateProviderProfile } from '../../../../networks/serviceProviders/providerNetwork';


type FieldKey = 'name' | 'phone' | 'bio' | 'location';

const FIELDS: {
  key: FieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
}[] = [
  { key: 'name', label: 'Full name', placeholder: 'Your name' },
  { key: 'phone', label: 'Phone number', placeholder: '+92…', keyboardType: 'phone-pad' },
  { key: 'location', label: 'Service area', placeholder: 'City or area you serve' },
  { key: 'bio', label: 'About you', placeholder: 'Tell customers about your work', multiline: true },
];

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const theme = useMemo(() => makeFlatProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { provider, loading } = useAppSelector((state: RootState) => state.profile);

  const [form, setForm] = useState<Record<FieldKey, string>>({
    name: '',
    phone: '',
    bio: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const changePhoto = useCallback(async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      const asset = !result.canceled && result.assets?.[0];
      if (!asset?.uri) return;
      setPhotoBusy(true);
      const url = await uploadAsset(asset.uri, 'avatar', {
        name: asset.fileName || undefined,
        mimeType: asset.mimeType || undefined,
        sizeBytes: asset.fileSize || undefined,
      });
      const res = await updateProviderProfile({ photoUrl: url } as any);
      if (!res.success) throw new Error(res.message || 'Your photo was not saved.');
      dispatch(fetchProfile());
    } catch (e: any) {
      Alert.alert("Couldn't update your photo", e?.message || 'Try again in a moment.');
    } finally {
      setPhotoBusy(false);
    }
  }, [dispatch]);

  // Make sure we are editing this provider's own current values, not whatever
  // happened to be in the store.
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    setForm({
      name: provider.name || '',
      phone: provider.phone || '',
      bio: provider.bio || '',
      location: provider.location || '',
    });
  }, [provider.name, provider.phone, provider.bio, provider.location]);

  const setField = useCallback((key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isDirty =
    form.name !== (provider.name || '') ||
    form.phone !== (provider.phone || '') ||
    form.bio !== (provider.bio || '') ||
    form.location !== (provider.location || '');

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateProfile({
          updates: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            bio: form.bio.trim(),
            location: form.location.trim(),
          },
        })
      ).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Could not save',
        typeof e === 'string' ? e : 'Your changes were not saved. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }, [dispatch, form, navigation]);

  return (
    <Screen>
      <AppBar
        title="Edit Profile"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.headerBtn, (!isDirty || saving) && styles.headerBtnDisabled]}
            disabled={!isDirty || saving}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Check size={22} color={isDirty ? theme.primary : theme.textTertiary} />
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {loading && !provider.name ? (
            <ActivityIndicator
              size="large"
              color={theme.primary}
              style={{ marginTop: 48 }}
            />
          ) : (
            <>
              {/* Customers see this photo on every card and booking. */}
              <View style={styles.photoRow}>
                <Avatar uri={provider.profileImage} name={provider.name} size={64} />
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={changePhoto}
                  disabled={photoBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                >
                  {photoBusy ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={styles.photoBtnText}>Change photo</Text>
                  )}
                </TouchableOpacity>
              </View>

              {FIELDS.map((field) => (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, field.multiline && styles.inputMultiline]}
                    value={form[field.key]}
                    onChangeText={(text) => setField(field.key, text)}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.textTertiary}
                    multiline={field.multiline}
                    keyboardType={field.keyboardType || 'default'}
                  />
                </View>
              ))}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.input, styles.inputReadOnly]}>
                  <Text style={styles.readOnlyText}>{provider.email || '—'}</Text>
                </View>
                <Text style={styles.hint}>
                  Contact support to change the email on your account.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!isDirty || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.saveBtnText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: FlatProviderTheme) => StyleSheet.create({
    photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xl },
    photoBtn: { marginLeft: S.lg, paddingVertical: S.sm, paddingHorizontal: S.lg, borderRadius: R.pill, backgroundColor: c.accentSoft },
    photoBtnText: { ...T.label, color: c.accentDeep },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnDisabled: { opacity: 0.4 },
  content: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 20 },
  label: { ...T.label, color: theme.textSecondary, marginBottom: S.sm },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...T.body,

    color: theme.text,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputReadOnly: { backgroundColor: c.surfaceSunken, justifyContent: 'center' },
  readOnlyText: { ...T.body, color: theme.textSecondary },
  hint: { ...T.caption, color: theme.textTertiary, marginTop: 6 },
  saveBtn: {
    marginTop: 8,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: theme.textTertiary },
  saveBtnText: { ...T.subhead, color: c.inkInverse },
});
