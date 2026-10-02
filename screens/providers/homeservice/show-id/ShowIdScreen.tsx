// ============================================================================
// Show your ID — the provider's half of the doorstep identity check.
//
// One short-lived, single-use proof for this job, offered three ways: a QR code
// for the customer to scan, a 6-digit code to read out, and (on phones with
// NFC) written to the provider's NFC badge for the customer to tap. The screen
// turns green when the customer's check lands.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppBar, Button, Card, EmptyState, Screen } from '../../../../components/ui';
import { C, GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  fetchJobIdentity,
  issueIdentityToken,
  type IdentityToken,
} from '../../../../networks/serviceProviders/identityApi';
import { isNfcEnabled, isNfcSupported, openNfcSettings, writeUriToTag, cancelNfc } from '../../../../services/nfc/nfcBadge';

const POLL_MS = 4000;
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
  const [nfc, setNfc] = useState(false);
  const [writing, setWriting] = useState(false);
  const [written, setWritten] = useState(false);
  const alive = useRef(true);

  const issue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWritten(false);
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
    isNfcSupported().then((ok) => alive.current && setNfc(ok));
    return () => {
      alive.current = false;
      cancelNfc();
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

  const writeBadge = async () => {
    if (!proof) return;
    if (!(await isNfcEnabled())) {
      Alert.alert('NFC is off', 'Turn on NFC in your phone settings to write your badge.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => openNfcSettings() },
      ]);
      return;
    }
    setWriting(true);
    try {
      await writeUriToTag(proof.nfcUri);
      setWritten(true);
    } catch (e: any) {
      if (e?.message !== 'Cancelled.') Alert.alert('Badge not written', e?.message || 'Please try again.');
    } finally {
      setWriting(false);
    }
  };

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
              <Text style={styles.muted}>Ask the customer to scan this</Text>
              <View style={[styles.qr, expired && styles.faded]} accessibilityLabel="Your ID QR code">
                {/* A QR code must stay dark-on-light in both themes, or scanners miss it. */}
                <QRCode value={proof.qrPayload} size={220} color={C.ink} backgroundColor={C.inkInverse} quietZone={12} />
              </View>
              <Text style={styles.muted}>or read out this code</Text>
              <Text style={[styles.code, expired && styles.faded]} accessibilityLabel={`Code ${proof.code.split('').join(' ')}`}>
                {proof.code.slice(0, 3)} {proof.code.slice(3)}
              </Text>
              <Text style={[styles.caption, expired && { color: colors.error }]}>
                {expired ? 'Expired' : `Expires in ${mmss(remaining)} · works once`}
              </Text>
              {expired && <Button label="Show a new code" onPress={issue} loading={loading} style={styles.top} />}
            </Card>

            {nfc && !expired && (
              <Card style={styles.nfc}>
                <Text style={styles.subhead}>NFC badge</Text>
                <Text style={styles.muted}>
                  Hold your NFC sticker or card to the back of your phone to load this code onto it; the customer then taps the badge with
                  their phone.
                </Text>
                <Button
                  label={written ? 'Badge ready — write again' : 'Write to my NFC badge'}
                  icon="radio-outline"
                  variant={written ? 'secondary' : 'primary'}
                  onPress={writeBadge}
                  loading={writing}
                  disabled={writing}
                  style={styles.top}
                />
              </Card>
            )}

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
    subhead: { ...T.subhead, color: c.ink, marginBottom: S.xs },
    muted: { ...T.body, color: c.inkMuted, textAlign: 'center' },
    caption: { ...T.caption, color: c.inkMuted, textAlign: 'center' },
    qr: { marginVertical: S.md, borderRadius: S.md, overflow: 'hidden' },
    code: { ...T.display, color: c.ink, letterSpacing: 4, fontVariant: ['tabular-nums'] },
    faded: { opacity: 0.25 },
    nfc: { marginTop: S.lg },
    top: { marginTop: S.md },
    note: { marginTop: S.lg },
  });
