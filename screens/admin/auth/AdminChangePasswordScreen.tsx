// ============================================================================
// Change the admin's password.
//
// Two ways in: voluntarily from the profile, or forced — a temporary password
// from a super admin, or one older than the security policy allows. A forced
// session can do nothing else until this succeeds (the server refuses every
// other call with PASSWORD_CHANGE_REQUIRED), so there is no back arrow, only
// sign-out. Changing the password signs out every other device.
// ============================================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button, TextField, showToast } from '../../../components/ui';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { changeAdminPassword, restrictionFrom, signOutAdmin } from '../../../networks/admin/auth';
import { toAdminApiError } from '../../../networks/admin/errors';
import { S, T, useTheme, type ThemeColors } from '../../../theme';
import AdminAuthLayout from './AdminAuthLayout';
import { adminProfileReceived, adminRestrictionChanged, adminSignedOut, selectAdminAuth } from './adminAuthSlice';
import { landingAfterSignIn } from './adminGate';
import { ADMIN_PASSWORD_MIN_LENGTH, localPasswordProblems, passwordProblems, signInErrorMessage } from './messages';

export default function AdminChangePasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { admin, restrict } = useAppSelector(selectAdminAuth);
  const forced = restrict === 'password_change';
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const local = localPasswordProblems(next, admin?.email);
    if (!current) return setError('Enter your current password.');
    if (local.length) return setProblems(local);
    if (next !== confirm) return setError('The new passwords do not match.');

    setSubmitting(true);
    setError(null);
    setProblems([]);
    try {
      const result = await changeAdminPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      const nextRestrict = restrictionFrom(result.restrict);
      dispatch(adminProfileReceived(result.admin));
      dispatch(adminRestrictionChanged(nextRestrict));
      const others = result.otherSessionsSignedOut;
      showToast({
        tone: 'success',
        message: others > 0 ? `Password changed. ${others} other device${others === 1 ? '' : 's'} signed out.` : 'Password changed.',
      });
      if (forced) navigation.reset({ index: 0, routes: [{ name: landingAfterSignIn(nextRestrict) }] });
      else navigation.goBack();
    } catch (err) {
      const apiError = toAdminApiError(err);
      if (apiError.code === 'WEAK_PASSWORD') setProblems(passwordProblems(apiError));
      else setError(apiError.code === 'INVALID_CREDENTIALS' ? 'Your current password is incorrect.' : signInErrorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  }, [admin?.email, confirm, current, dispatch, forced, navigation, next]);

  const signOut = useCallback(async () => {
    await signOutAdmin();
    dispatch(adminSignedOut());
  }, [dispatch]);

  return (
    <AdminAuthLayout
      barTitle="Change password"
      hideBack={forced}
      title={forced ? 'Set a new password' : 'Change password'}
      subtitle={
        forced
          ? 'Your password was set by an administrator or has expired. Choose a new one to continue.'
          : 'Other devices signed in to your account will be signed out.'
      }
    >
      <TextField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="next"
        onSubmitEditing={() => newRef.current?.focus()}
        editable={!submitting}
      />
      <TextField
        ref={newRef}
        label="New password"
        value={next}
        onChangeText={(v) => {
          setNext(v);
          if (problems.length) setProblems([]);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        helper={`At least ${ADMIN_PASSWORD_MIN_LENGTH} characters. A short phrase is easier to remember than symbols.`}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!submitting}
      />
      {problems.length > 0 && (
        <View style={styles.problems} accessibilityLiveRegion="polite">
          {problems.map((p) => (
            <Text key={p} style={styles.problem}>
              • {p}
            </Text>
          ))}
        </View>
      )}
      <TextField
        ref={confirmRef}
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!submitting}
        error={error}
      />
      <Button label="Change password" onPress={submit} loading={submitting} disabled={submitting} fullWidth size="lg" />
      {forced && <Button label="Sign out" variant="ghost" onPress={signOut} fullWidth style={styles.signOut} />}
    </AdminAuthLayout>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    problems: { marginTop: -S.sm, marginBottom: S.lg },
    problem: { ...T.caption, color: c.error },
    signOut: { marginTop: S.md },
  });
