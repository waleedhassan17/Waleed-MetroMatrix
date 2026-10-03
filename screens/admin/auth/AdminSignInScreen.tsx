// ============================================================================
// Admin console sign-in.
//
// Reached from "Staff sign-in" on the customer sign-in screen. It replaces a
// hardcoded list of admin email addresses in the customer sign-in flow: who is
// an admin is the server's answer, not something compiled into the app.
// ============================================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Button, TextField } from '../../../components/ui';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { signInAdmin } from '../../../networks/admin/auth';
import { toAdminApiError } from '../../../networks/admin/errors';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';
import AdminAuthLayout from './AdminAuthLayout';
import { clearAdminNotice } from './adminAuthSlice';
import { finishAdminSignIn } from './finishSignIn';
import { signInErrorMessage } from './messages';

export default function AdminSignInScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const notice = useAppSelector((state) => state.adminAuth.notice);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    dispatch(clearAdminNotice());
    try {
      const result = await signInAdmin(email, password);
      setPassword('');
      if (result.step === 'totp_required') {
        navigation.navigate('AdminTotp', {
          challengeToken: result.challengeToken,
          expiresInSeconds: result.expiresInSeconds,
        });
      } else {
        finishAdminSignIn(dispatch, navigation, result);
      }
    } catch (err) {
      setError(signInErrorMessage(toAdminApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }, [dispatch, email, navigation, password]);

  return (
    <AdminAuthLayout
      barTitle="Staff sign-in"
      title="Admin console"
      subtitle="Sign in with your MetroMatrix staff account."
    >
      {!!notice && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      <TextField
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!submitting}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!submitting}
        error={error}
        right={
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={12}
            style={styles.reveal}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.inkMuted} />
          </Pressable>
        }
      />

      <Button label="Sign in" onPress={submit} loading={submitting} disabled={submitting} fullWidth size="lg" />

      <Text style={styles.help}>
        Forgotten your password or lost your authenticator? Ask a super admin to reset it.
      </Text>
    </AdminAuthLayout>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: S.sm,
      padding: S.md,
      marginBottom: S.lg,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.infoSoft,
    },
    noticeText: { ...T.body, color: c.ink, flex: 1 },
    reveal: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    help: { ...T.caption, color: c.inkMuted, marginTop: S.xl, textAlign: 'center' },
  });
