// ============================================================================
// Second sign-in step: a code from the authenticator app, or a recovery code.
//
// The challenge token from step one is valid for five minutes; after that the
// server answers TOKEN_INVALID and the admin starts again from the password.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Button, TextField } from '../../../components/ui';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { verifyAdminTotp } from '../../../networks/admin/auth';
import { toAdminApiError } from '../../../networks/admin/errors';
import { S, T, useTheme, type ThemeColors } from '../../../theme';
import AdminAuthLayout from './AdminAuthLayout';
import { finishAdminSignIn } from './finishSignIn';
import { signInErrorMessage } from './messages';

type Params = { challengeToken: string; expiresInSeconds?: number };

export default function AdminTotpScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { challengeToken } = (useRoute().params ?? {}) as Params;

  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(!challengeToken);

  const submit = useCallback(async () => {
    const value = code.trim();
    if (useRecovery ? value.length < 6 : !/^\d{6}$/.test(value)) {
      setError(useRecovery ? 'Enter one of your recovery codes.' : 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyAdminTotp(challengeToken, useRecovery ? { recoveryCode: value } : { code: value });
      if (result.step === 'signed_in') finishAdminSignIn(dispatch, navigation, result);
    } catch (err) {
      const apiError = toAdminApiError(err);
      if (apiError.code === 'TOKEN_INVALID') setExpired(true);
      setError(signInErrorMessage(apiError));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }, [challengeToken, code, dispatch, navigation, useRecovery]);

  if (expired) {
    return (
      <AdminAuthLayout barTitle="Two-factor sign-in" title="Start again" subtitle={error ?? 'This sign-in attempt has expired.'}>
        <Button label="Back to sign-in" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'AdminSignIn' }] })} fullWidth size="lg" />
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout
      barTitle="Two-factor sign-in"
      title={useRecovery ? 'Use a recovery code' : 'Enter your code'}
      subtitle={
        useRecovery
          ? 'Each recovery code works once. You saved them when you turned on two-factor sign-in.'
          : 'Open your authenticator app and enter the 6-digit code for MetroMatrix Admin.'
      }
    >
      <TextField
        key={useRecovery ? 'recovery' : 'totp'}
        label={useRecovery ? 'Recovery code' : 'Code'}
        value={code}
        onChangeText={(v) => {
          setCode(useRecovery ? v : v.replace(/\D/g, '').slice(0, 6));
          if (error) setError(null);
        }}
        keyboardType={useRecovery ? 'default' : 'number-pad'}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={useRecovery ? 'off' : 'one-time-code'}
        textContentType={useRecovery ? 'none' : 'oneTimeCode'}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!submitting}
        error={error}
        inputStyle={useRecovery ? undefined : styles.codeInput}
      />
      <Button label="Verify" onPress={submit} loading={submitting} disabled={submitting} fullWidth size="lg" />
      <Button
        label={useRecovery ? 'Use the authenticator app instead' : 'Use a recovery code instead'}
        variant="ghost"
        onPress={() => {
          setUseRecovery((v) => !v);
          setCode('');
          setError(null);
        }}
        fullWidth
        style={styles.switch}
      />
      <Text style={styles.help}>Lost both? Ask a super admin to reset your two-factor sign-in.</Text>
    </AdminAuthLayout>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    codeInput: { ...T.heading, letterSpacing: 6, fontVariant: ['tabular-nums'] },
    switch: { marginTop: S.md },
    help: { ...T.caption, color: c.inkMuted, marginTop: S.xl, textAlign: 'center' },
  });
