// ============================================
// Provider availability settings (HS7) — online/offline toggle + service
// radius. updateProviderOnlineStatus() existed in providerNetwork with no UI
// at all; this screen is its home.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
// react-native's own SafeAreaView is iOS-only — on Android it is a plain View,
// which is why this screen also hand-rolled a StatusBar.currentHeight pad on
// its header. The context version applies real insets on both platforms.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchProviderProfile,
  updateProviderOnlineStatus,
  updateProviderProfile,
} from '../../../../networks/serviceProviders/providerNetwork';
import { HS } from '../../../../constants/HomeServiceTheme';
import { C } from '../../../../constants/theme';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30];

export default function AvailabilityScreen() {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HS.accent} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={HS.accent} />
          <Text style={styles.stateText}>Loading availability…</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {savedMsg && (
            <View style={styles.savedBanner}>
              <Ionicons name="checkmark-circle" size={16} color={HS.accentDeep} />
              <Text style={styles.savedText}>{savedMsg}</Text>
            </View>
          )}

          {/* Online toggle */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.dot, { backgroundColor: isOnline ? HS.accent : C.inkFaint }]} />
              <View style={{ flex: 1 }}>
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
                trackColor={{ false: C.disabled, true: HS.accentLine }}
                thumbColor={isOnline ? HS.accent : C.lineSoft}
                disabled={saving}
              />
            </View>
          </View>

          {/* Service radius */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Service radius</Text>
            <Text style={styles.cardSub}>
              How far you are willing to travel for a job. Affects your ranking in
              nearby searches.
            </Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.radiusChip, radius === km && styles.radiusChipActive]}
                  onPress={() => pickRadius(km)}
                  disabled={saving}
                >
                  <Text
                    style={[styles.radiusChipText, radius === km && styles.radiusChipTextActive]}
                  >
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color={C.inkMuted} />
            <Text style={styles.hintText}>
              Being online adds an availability bonus to your matching score, so you
              appear higher when customers search.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: HS.accent,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  body: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  cardSub: { fontSize: 13, color: C.inkMuted, marginTop: 4, lineHeight: 18 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  radiusChip: {
    borderWidth: 1,
    borderColor: C.disabled,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  radiusChipActive: { backgroundColor: HS.accent, borderColor: HS.accent },
  radiusChipText: { color: C.inkMuted, fontWeight: '600', fontSize: 13 },
  radiusChipTextActive: { color: '#fff' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 },
  hintText: { color: C.inkMuted, fontSize: 12, marginLeft: 6, flex: 1, lineHeight: 17 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 13, flex: 1, marginLeft: 6 },
  retryText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HS.accentSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  savedText: { color: HS.accentDeep, fontSize: 13, marginLeft: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: C.inkMuted, fontSize: 14 },
});
