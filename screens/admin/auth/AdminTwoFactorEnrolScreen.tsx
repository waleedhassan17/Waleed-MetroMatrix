// ============================================================================
// Turn on two-factor sign-in (TOTP).
//
//   1. password  — confirm it is really the admin (POST /auth/2fa/enrol)
//   2. app       — add the account to an authenticator app: open the
//                  otpauth:// link on this phone, or type the key
//   3. verify    — a code from the app proves it worked (POST /auth/2fa/verify)
//   4. codes     — the one-time recovery codes, shown once
//
// When the security policy requires two-factor for super admins, an
// unenrolled super admin lands here and can do nothing else until step 3.
// Turning it on signs out every other device.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button, TextField } from '../../../components/ui';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  confirmTwoFactor,
  fetchAdminProfile,
  signOutAdmin,
  startTwoFactorEnrolment,
} from '../../../networks/admin/auth';
import { toAdminApiError } from '../../../networks/admin/errors';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';
import AdminAuthLayout from './AdminAuthLayout';
import { adminProfileReceived, adminSignedOut, selectAdminAuth } from './adminAuthSlice';
import { landingAfterSignIn } from './adminGate';
import { signInErrorMessage } from './messages';
import RecoveryCodesView from './RecoveryCodesView';

type Step = 'password' | 'app' | 'codes';
type Setup = { secret: string; otpauthUrl: string; account: string };

// "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP": easier to type from the screen.
const groupKey = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim();

export default function AdminTwoFactorEnrolScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { restrict } = useAppSelector(selectAdminAuth);
  const forced = restrict === 'totp_enrol';

  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = useCallback(async () => {
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError(null);
    try {
      const data = await startTwoFactorEnrolment(password);
      setPassword('');
      setSetup({ secret: data.secret, otpauthUrl: data.otpauthUrl, account: data.account });
      setStep('app');
    } catch (err) {
      const apiError = toAdminApiError(err);
      setError(apiError.code === 'INVALID_CREDENTIALS' ? 'Your password is incorrect.' : signInErrorMessage(apiError));
    } finally {
      setBusy(false);
    }
  }, [password]);

  const verify = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your authenticator app.');
    setBusy(true);
    setError(null);
    try {
      const data = await confirmTwoFactor(code);
      setCodes(data.recoveryCodes);
      setStep('codes');
    } catch (err) {
      setError(signInErrorMessage(toAdminApiError(err)));
      setCode('');
    } finally {
      setBusy(false);
    }
  }, [code]);

  const finish = useCallback(async () => {
    // The restriction is lifted on the server; reload the profile so the app agrees.
    let nextRestrict = null as typeof restrict;
    try {
      const profile = await fetchAdminProfile();
      dispatch(adminProfileReceived(profile));
      nextRestrict = (profile.restrict as typeof restrict) ?? null;
    } catch {
      // The console will reload it on the next call.
    }
    if (forced) navigation.reset({ index: 0, routes: [{ name: landingAfterSignIn(nextRestrict) }] });
    else navigation.goBack();
  }, [dispatch, forced, navigation]);

  const openAuthenticator = useCallback(async () => {
    if (!setup) return;
    try {
      await Linking.openURL(setup.otpauthUrl);
    } catch {
      setError('No authenticator app on this phone opened the link. Type the key below instead.');
    }
  }, [setup]);

  const signOut = useCallback(async () => {
    await signOutAdmin();
    dispatch(adminSignedOut());
  }, [dispatch]);

  if (step === 'codes') {
    return (
      <AdminAuthLayout
        barTitle="Two-factor sign-in"
        hideBack
        title="Save your recovery codes"
        subtitle="Two-factor sign-in is on. Other devices were signed out."
      >
        <RecoveryCodesView codes={codes} onDone={finish} />
      </AdminAuthLayout>
    );
  }

  if (step === 'app' && setup) {
    return (
      <AdminAuthLayout
        barTitle="Two-factor sign-in"
        hideBack={forced}
        title="Add MetroMatrix to your authenticator"
        subtitle="Use Google Authenticator, Microsoft Authenticator, 1Password or any app that supports 6-digit codes."
      >
        <Button label="Open authenticator app" icon="open-outline" onPress={openAuthenticator} fullWidth />
        <Text style={styles.or}>or enter this key manually</Text>
        <View style={styles.keyBox}>
          <Text style={styles.key} selectable accessibilityLabel={`Setup key ${setup.secret.split('').join(' ')}`}>
            {groupKey(setup.secret)}
          </Text>
          <Text style={styles.keyMeta}>Account: {setup.account} · time-based</Text>
        </View>
        <TextField
          label="Code from the app"
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/\D/g, '').slice(0, 6));
            if (error) setError(null);
          }}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="go"
          onSubmitEditing={verify}
          editable={!busy}
          error={error}
          inputStyle={styles.codeInput}
        />
        <Button label="Turn on two-factor sign-in" onPress={verify} loading={busy} disabled={busy} fullWidth size="lg" />
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout
      barTitle="Two-factor sign-in"
      hideBack={forced}
      title="Turn on two-factor sign-in"
      subtitle={
        forced
          ? 'The security policy requires two-factor sign-in for super admins. Set it up to continue.'
          : 'Signing in will need your password and a code from your phone.'
      }
    >
      <TextField
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={begin}
        editable={!busy}
        error={error}
      />
      <Button label="Continue" onPress={begin} loading={busy} disabled={busy} fullWidth size="lg" />
      {forced && <Button label="Sign out" variant="ghost" onPress={signOut} fullWidth style={styles.signOut} />}
    </AdminAuthLayout>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    or: { ...T.caption, color: c.inkMuted, textAlign: 'center', marginVertical: S.lg },
    keyBox: {
      padding: S.lg,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
      marginBottom: S.xl,
    },
    // Larger than T.mono: this key is read off the screen and typed by hand.
    key: { ...T.mono, fontSize: T.subhead.fontSize, lineHeight: T.subhead.lineHeight, color: c.ink, letterSpacing: 1 },
    keyMeta: { ...T.caption, color: c.inkMuted, marginTop: S.sm },
    codeInput: { ...T.heading, letterSpacing: 6, fontVariant: ['tabular-nums'] },
    signOut: { marginTop: S.md },
  });
