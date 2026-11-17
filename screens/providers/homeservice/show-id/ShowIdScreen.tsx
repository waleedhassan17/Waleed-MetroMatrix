// ============================================================================
// Show your ID — the provider's half of the doorstep identity check.
//
// One short-lived, single-use 6-digit code for this job, read out to the
// customer, who types it into their app. The screen turns green when the
// customer's check lands.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, Button, Card, EmptyState, Screen } from '../../../../components/ui';
import { GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  fetchJobIdentity,
  issueIdentityToken,
  type IdentityToken,
} from '../../../../networks/serviceProviders/identityApi';

const POLL_MS = 4000;
// `nfc` / `qr` only appear on checks made before those methods were removed.
const METHOD_LABEL: Record<string, string> = { nfc: 'NFC badge', qr: 'QR code', code: '6-digit code' };

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function ShowIdScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { jobId, customerName } = (useRoute<any>().params || {}) as { jobId: string; customerName?: string };

  const [proof, setProof] = useState<IdentityToken | null>(null);
  const [verified, setVerified] = useState<{ verifiedAt: string; method: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const alive = useRef(true);

  const issue = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await issueIdentityToken(jobId);
    if (!alive.current) return;
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.message || 'Could not create your ID code.');
      return;
    }
    if ('alreadyVerified' in res.data) setVerified({ verifiedAt: res.data.verifiedAt, method: res.data.method });
    else setProof(res.data);
  }, [jobId]);

  useEffect(() => {
    alive.current = true;
    issue();
    return () => {
      alive.current = false;
    };
  }, [issue]);

  // Countdown to expiry.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Has the customer verified me yet? Polled only while this screen is in front.
  useFocusEffect(
    useCallback(() => {
      if (verified) return undefined;
      const t = setInterval(async () => {
        const identity = await fetchJobIdentity(jobId);
        if (identity && alive.current) setVerified(identity);
      }, POLL_MS);
      return () => clearInterval(t);
    }, [jobId, verified])
  );

  const remaining = proof ? new Date(proof.expiresAt).getTime() - now : 0;
  const expired = !!proof && remaining <= 0;

  return (
    <Screen>
      <AppBar title="Show your ID" subtitle={customerName ? `For ${customerName}` : undefined} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {verified ? (
          <Card style={styles.center}>
            <Ionicons name="shield-checkmark" size={56} color={colors.success} />
            <Text style={styles.title}>Identity confirmed</Text>
            <Text style={styles.muted}>
              {customerName || 'The customer'} checked your ID with the {METHOD_LABEL[verified.method] || verified.method}.
            </Text>
            <Button label="Back to the job" onPress={() => navigation.goBack()} style={styles.top} />
          </Card>
        ) : loading && !proof ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accentDeep} />
          </View>
        ) : error && !proof ? (
          <EmptyState icon="alert-circle-outline" title="No ID code" message={error} />
        ) : proof ? (
          <>
            <Card style={styles.center}>
              <Text style={styles.muted}>Read this code out to the customer</Text>
              <Text style={[styles.code, expired && styles.faded]} accessibilityLabel={`Code ${proof.code.split('').join(' ')}`}>
                {proof.code.slice(0, 3)} {proof.code.slice(3)}
              </Text>
              <Text style={[styles.caption, expired && { color: colors.error }]}>
                {expired ? 'Expired' : `Expires in ${mmss(remaining)} · works once`}
              </Text>
              {expired && <Button label="Show a new code" onPress={issue} loading={loading} style={styles.top} />}
            </Card>

            <Text style={[styles.caption, styles.note]}>
              Waiting for the customer to check… This screen updates by itself.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: S.huge },
    center: { alignItems: 'center', paddingVertical: S.xl, gap: S.sm },
    title: { ...T.heading, color: c.ink, textAlign: 'center' },
    muted: { ...T.body, color: c.inkMuted, textAlign: 'center' },
    caption: { ...T.caption, color: c.inkMuted, textAlign: 'center' },
    code: { ...T.display, color: c.ink, letterSpacing: 4, fontVariant: ['tabular-nums'], marginVertical: S.md },
    faded: { opacity: 0.25 },
    top: { marginTop: S.md },
    note: { marginTop: S.lg },
  });
