// ============================================================================
// Provider "Edit Profile".
//
// The Account list on the provider profile linked here, except the link did
// nothing and this screen did not exist. The slice thunk (updateProfile) and
// the endpoint (PATCH /provider/profile) were both already in place — only the
// screen was missing.
//
// Scope is deliberately the four fields updateProfile actually sends: name,
// phone, bio and location. An avatar picker needs an upload path and is a
// separate piece of work; the field is shown read-only rather than pretending.
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../store/store';
import { updateProfile, fetchProfile } from '../profile-screen/profileSlice';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { flatTheme as theme } from '../providerTheme';


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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.headerBtn, (!isDirty || saving) && styles.headerBtnDisabled]}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Check size={22} color={isDirty ? theme.primary : theme.textTertiary} />
          )}
        </TouchableOpacity>
      </View>

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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnDisabled: { opacity: 0.4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  content: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputReadOnly: { backgroundColor: '#F3F4F6', justifyContent: 'center' },
  readOnlyText: { fontSize: 15, color: theme.textSecondary },
  hint: { fontSize: 12, color: theme.textTertiary, marginTop: 6 },
  saveBtn: {
    marginTop: 8,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: theme.textTertiary },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
