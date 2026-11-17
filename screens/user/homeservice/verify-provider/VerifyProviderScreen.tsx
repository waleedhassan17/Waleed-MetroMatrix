// ============================================================================
// Verify your provider — the customer's half of the doorstep identity check.
//
// Before opening the door, make sure the person outside is the provider you
// booked: type the 6-digit code they read out from their "Show your ID"
// screen. The server checks the code is for THIS booking, current and unused.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, Button, Card, Screen, TextField } from '../../../../components/ui';
import { GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { apiRequest } from '../../../../networks/serviceProviders/config';
import { verifyProviderIdentity, type IdentityVerification } from '../../../../networks/serviceProviders/identityApi';

// `nfc` / `qr` only appear on checks made before those methods were removed.
const METHOD_LABEL: Record<string, string> = { nfc: 'their NFC badge', qr: 'their QR code', code: 'their 6-digit code' };

export default function VerifyProviderScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const params = (useRoute<any>().params || {}) as { bookingId?: string; providerName?: string };
  const bookingId = params.bookingId || '';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityVerification | null>(null);
  const [providerName, setProviderName] = useState(params.providerName || '');

  const submit = useCallback(async () => {
    if (!bookingId || busy) return;
    setBusy(true);
    setError(null);
    const res = await verifyProviderIdentity(bookingId, { code });
    setBusy(false);
    if (res.success && res.data) setResult(res.data);
    else setError(res.message || 'Could not verify. Try again.');
  }, [bookingId, busy, code]);

  useEffect(() => {
    // Already verified? Then just say so.
    if (!bookingId) return;
    apiRequest<any>(`/bookings/${encodeURIComponent(bookingId)}`, { bestEffort: true }).then((res) => {
      if (!res.success) return;
      if (res.data?.provider?.name && !params.providerName) setProviderName(res.data.provider.name);
      const identity = res.data?.identity;
      if (identity?.verifiedAt) {
        setResult({ verified: true, already: true, method: identity.method, verifiedAt: identity.verifiedAt, status: res.data.canonicalStatus });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (!bookingId) {
    return (
      <Screen>
        <AppBar title="Verify your provider" onBack={() => navigation.goBack()} />
        <View style={styles.content}>
          <Text style={styles.muted}>Open this from your booking to check your provider's ID.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar title="Verify your provider" subtitle={providerName || undefined} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {result ? (
          <Card style={styles.center}>
            <Ionicons name="shield-checkmark" size={56} color={colors.success} />
            <Text style={styles.title}>{providerName || 'Your provider'} is verified</Text>
            <Text style={styles.muted}>
              Checked with {METHOD_LABEL[result.method] || result.method} at{' '}
              {new Date(result.verifiedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}. This is the person you booked.
            </Text>
            <Button label="Done" onPress={() => navigation.goBack()} style={styles.top} />
          </Card>
        ) : (
          <>
            <Text style={styles.intro}>Before you open the door, check that this is the provider you booked.</Text>
            <Card>
              <Text style={styles.muted}>Ask the provider to read out the 6-digit code on their "Show your ID" screen.</Text>
              <TextField
                label="6-digit code"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                containerStyle={styles.top}
                accessibilityLabel="Provider's 6-digit code"
              />
              <Button label="Verify" onPress={submit} loading={busy} disabled={code.length !== 6 || busy} style={styles.top} />
            </Card>

            {busy && <ActivityIndicator color={colors.accentDeep} style={styles.top} />}
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Text style={styles.caption}>Codes change every 10 minutes and work only once.</Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: S.huge },
    intro: { ...T.body, color: c.ink, marginBottom: S.md },
    center: { alignItems: 'center', gap: S.sm, paddingVertical: S.lg },
    title: { ...T.heading, color: c.ink, textAlign: 'center' },
    muted: { ...T.body, color: c.inkMuted, textAlign: 'center' },
    caption: { ...T.caption, color: c.inkFaint, textAlign: 'center', marginTop: S.lg },
    error: { ...T.body, color: c.error, textAlign: 'center', marginTop: S.md },
    top: { marginTop: S.md },
  });
