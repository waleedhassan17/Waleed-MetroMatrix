// ============================================
// Provider availability settings (HS7) — online/offline toggle + service
// radius. updateProviderOnlineStatus() existed in providerNetwork with no UI
// at all; this screen is its home.
// ============================================

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchProviderProfile,
  updateProviderOnlineStatus,
  updateProviderProfile,
} from '../../../../networks/serviceProviders/providerNetwork';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C, GUTTER, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import { AppBar, Card, Chip, Screen } from '../../../../components/ui';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30];

export default function AvailabilityScreen() {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [radius, setRadius] = useState(15);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchProviderProfile();
    if (res.success && res.data) {
      setIsOnline(!!res.data.isOnline);
      setRadius((res.data as any).serviceRadius || 15);
    } else {
      setError(res.message || 'Failed to load availability');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flashSaved = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2000);
  };

  const toggleOnline = async (value: boolean) => {
    setIsOnline(value);
    setSaving(true);
    const res = await updateProviderOnlineStatus(value);
    setSaving(false);
    if (!res.success) {
      setIsOnline(!value); // revert on failure
      setError(res.message || 'Failed to update status');
    } else {
      setError(null);
      flashSaved(value ? 'You are now online' : 'You are now offline');
    }
  };

  const pickRadius = async (km: number) => {
    const prev = radius;
    setRadius(km);
    setSaving(true);
    const res = await updateProviderProfile({ serviceRadius: km } as any);
    setSaving(false);
    if (!res.success) {
      setRadius(prev);
      setError(res.message || 'Failed to update service radius');
    } else {
      setError(null);
      flashSaved(`Service radius set to ${km} km`);
    }
  };

  return (
    <Screen>
      <AppBar title="Availability" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.stateText}>Loading availability…</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retryText} onPress={load}>
                Retry
              </Text>
            </View>
          )}
          {savedMsg && (
            <View style={styles.savedBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accentDeep} />
              <Text style={styles.savedText}>{savedMsg}</Text>
            </View>
          )}

          {/* Online toggle. The one card on this screen that should be read
              first, so it is the only raised one. */}
          <Card elevation="raised" style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.dot, { backgroundColor: isOnline ? colors.accent : colors.inkFaint }]} />
              <View style={styles.grow}>
                <Text style={styles.cardTitle}>
                  {isOnline ? 'You are Online' : 'You are Offline'}
                </Text>
                <Text style={styles.cardSub}>
                  {isOnline
                    ? 'Customers can find you in search and send new job requests.'
                    : 'You are hidden from search and will not receive new requests.'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ false: colors.disabled, true: colors.accentLine }}
                thumbColor={isOnline ? colors.accent : colors.lineSoft}
                disabled={saving}
              />
            </View>
          </Card>

          {/* Service radius */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Service radius</Text>
            <Text style={styles.cardSub}>
              How far you are willing to travel for a job. Affects your ranking in
              nearby searches.
            </Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((km) => (
                <Chip
                  key={km}
                  label={`${km} km`}
                  selected={radius === km}
                  onPress={() => pickRadius(km)}
                  disabled={saving}
                  style={styles.radiusChip}
                />
              ))}
            </View>
          </Card>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkMuted} />
            <Text style={styles.hintText}>
              Being online adds an availability bonus to your matching score, so you
              appear higher when customers search.
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  body: { padding: GUTTER },
  grow: { flex: 1 },
  card: { marginBottom: S.md },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: S.md },
  cardTitle: { ...T.subhead, color: c.ink },
  cardSub: { ...T.body, color: c.inkMuted, marginTop: S.xs },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.md },
  radiusChip: { marginRight: S.sm, marginBottom: S.sm },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: S.xs },
  hintText: { ...T.caption, color: c.inkMuted, marginLeft: 6, flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.errorSoft,
    borderRadius: R.control,
    padding: S.sm + 2,
    marginBottom: S.md,
  },
  errorText: { ...T.body, color: c.error, flex: 1, marginLeft: 6 },
  retryText: { ...T.bodyStrong, color: c.error },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentSoft,
    borderRadius: R.control,
    padding: S.sm + 2,
    marginBottom: S.md,
  },
  savedText: { ...T.body, color: c.accentDeep, marginLeft: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl },
  stateText: { ...T.body, marginTop: S.sm, color: c.inkMuted },
});
