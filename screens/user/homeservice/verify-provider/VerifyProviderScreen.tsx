// ============================================================================
// Verify your provider — the customer's half of the doorstep identity check.
//
// Before opening the door, make sure the person outside is the provider you
// booked: scan the QR code on their phone, tap their NFC badge, or type the
// 6-digit code they read out. The server checks the proof is genuine, for THIS
// booking, current and unused. Also opened straight from a tapped badge or a
// QR scanned with the camera app (metromatrix://verify?t=…).
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import type * as ExpoCamera from 'expo-camera';

import { AppBar, Button, Card, Screen, SegmentedControl, TextField } from '../../../../components/ui';
import { GUTTER, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { apiRequest } from '../../../../networks/serviceProviders/config';
import { verifyProviderIdentity, type IdentityVerification } from '../../../../networks/serviceProviders/identityApi';
import { isNfcEnabled, isNfcSupported, openNfcSettings, readUriFromTag, cancelNfc } from '../../../../services/nfc/nfcBadge';
import { parseIdentityLink } from '../../../../utils/homeservice/identityLink';

type Mode = 'qr' | 'nfc' | 'code';
const METHOD_LABEL: Record<string, string> = { nfc: 'their NFC badge', qr: 'their QR code', code: 'their 6-digit code' };

// expo-camera is native: loaded defensively so an older app build shows the
// other two options instead of crashing (same idea as mapLibreSafe.ts).
let cameraMod: typeof ExpoCamera | null | undefined;
function loadCamera(): typeof ExpoCamera | null {
  if (cameraMod !== undefined) return cameraMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cameraMod = require('expo-camera') as typeof ExpoCamera;
    if (!cameraMod?.CameraView) cameraMod = null;
  } catch {
    cameraMod = null;
  }
  return cameraMod;
}

function QrScanner({ onScan, paused }: { onScan: (data: string) => void; paused: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Camera = loadCamera() as typeof ExpoCamera;
  const [permission, requestPermission] = Camera.useCameraPermissions();
  if (!permission) return <ActivityIndicator color={colors.accentDeep} />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Allow the camera to scan the provider's QR code.</Text>
        <Button
          label={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={styles.top}
        />
      </View>
    );
  }
  return (
    <View style={styles.camera}>
      <Camera.CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={paused ? undefined : ({ data }) => onScan(data)}
      />
    </View>
  );
}

export default function VerifyProviderScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const params = (useRoute<any>().params || {}) as { bookingId?: string; providerName?: string; t?: string; via?: string };

  // Opened from a badge / camera-app link: the token names the booking.
  const fromLink = useMemo(
    () => (params.t ? parseIdentityLink(`metromatrix://verify?t=${encodeURIComponent(params.t)}&via=${params.via || ''}`) : null),
    [params.t, params.via]
  );
  const bookingId = params.bookingId || fromLink?.bookingId || '';

  const cameraAvailable = useMemo(() => loadCamera() !== null, []);
  const [nfc, setNfc] = useState(false);
  const [mode, setMode] = useState<Mode>(cameraAvailable ? 'qr' : 'code');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityVerification | null>(null);
  const [providerName, setProviderName] = useState(params.providerName || '');
  const submitted = useRef(false);

  const submit = useCallback(
    async (proof: { token: string; method: 'nfc' | 'qr' } | { code: string }) => {
      if (!bookingId || busy) return;
      setBusy(true);
      setError(null);
      const res = await verifyProviderIdentity(bookingId, proof);
      setBusy(false);
      if (res.success && res.data) setResult(res.data);
      else setError(res.message || 'Could not verify. Try again.');
    },
    [bookingId, busy]
  );

  const submitScanned = useCallback(
    (raw: string, method: 'nfc' | 'qr') => {
      const link = parseIdentityLink(raw);
      if (!link) {
        setError("That isn't a MetroMatrix ID code.");
        return;
      }
      if (link.bookingId !== bookingId) {
        setError('That ID is for a different booking — ask the provider to open your job.');
        return;
      }
      submit({ token: link.token, method });
    },
    [bookingId, submit]
  );

  useEffect(() => {
    isNfcSupported().then(setNfc);
    // Already verified? Then just say so.
    if (bookingId) {
      apiRequest<any>(`/bookings/${encodeURIComponent(bookingId)}`, { bestEffort: true }).then((res) => {
        if (!res.success) return;
        if (res.data?.provider?.name && !params.providerName) setProviderName(res.data.provider.name);
        const identity = res.data?.identity;
        if (identity?.verifiedAt) {
          setResult({ verified: true, already: true, method: identity.method, verifiedAt: identity.verifiedAt, status: res.data.canonicalStatus });
        }
      });
    }
    return () => cancelNfc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // A link that opened this screen is checked straight away, once.
  useEffect(() => {
    if (fromLink && !submitted.current) {
      submitted.current = true;
      submit({ token: fromLink.token, method: fromLink.via === 'nfc' ? 'nfc' : 'qr' });
    }
  }, [fromLink, submit]);

  const tapBadge = async () => {
    if (!(await isNfcEnabled())) {
      setError('Turn on NFC in your phone settings, then try again.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const raw = await readUriFromTag();
      setBusy(false);
      submitScanned(raw, 'nfc');
    } catch (e: any) {
      setBusy(false);
      if (e?.message !== 'Cancelled.') setError(e?.message || "Couldn't read the badge.");
    }
  };

  const options = [
    ...(cameraAvailable ? [{ value: 'qr' as Mode, label: 'Scan QR' }] : []),
    ...(nfc ? [{ value: 'nfc' as Mode, label: 'Tap badge' }] : []),
    { value: 'code' as Mode, label: 'Enter code' },
  ];

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
            <SegmentedControl<Mode>
              options={options}
              value={options.some((o) => o.value === mode) ? mode : 'code'}
              onChange={(m) => {
                cancelNfc();
                setError(null);
                setMode(m);
              }}
              style={styles.segment}
            />

            {mode === 'qr' && cameraAvailable && (
              <Card>
                <Text style={styles.muted}>Point your camera at the QR code on the provider's phone.</Text>
                <View style={styles.top}>
                  <QrScanner paused={busy || !!error} onScan={(data) => submitScanned(data, 'qr')} />
                </View>
                {!!error && <Button label="Scan again" variant="secondary" onPress={() => setError(null)} style={styles.top} />}
              </Card>
            )}

            {mode === 'nfc' && nfc && (
              <Card style={styles.center}>
                <Ionicons name="radio-outline" size={40} color={colors.accentDeep} />
                <Text style={styles.muted}>Ask the provider for their badge, then hold it to the back of your phone.</Text>
                <Button label={busy ? 'Waiting for the badge…' : 'Tap the badge'} onPress={tapBadge} loading={busy} disabled={busy} style={styles.top} />
                {/Turn on NFC/.test(error || '') && (
                  <Button label="Open NFC settings" variant="ghost" onPress={() => openNfcSettings()} />
                )}
              </Card>
            )}

            {mode === 'code' && (
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
                <Button label="Verify" onPress={() => submit({ code })} loading={busy} disabled={code.length !== 6 || busy} style={styles.top} />
              </Card>
            )}

            {busy && mode !== 'nfc' && <ActivityIndicator color={colors.accentDeep} style={styles.top} />}
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
    segment: { marginBottom: S.lg },
    center: { alignItems: 'center', gap: S.sm, paddingVertical: S.lg },
    title: { ...T.heading, color: c.ink, textAlign: 'center' },
    muted: { ...T.body, color: c.inkMuted, textAlign: 'center' },
    caption: { ...T.caption, color: c.inkFaint, textAlign: 'center', marginTop: S.lg },
    error: { ...T.body, color: c.error, textAlign: 'center', marginTop: S.md },
    camera: { height: 280, borderRadius: S.md, overflow: 'hidden', backgroundColor: c.surfaceSunken },
    top: { marginTop: S.md },
  });
