// ============================================
// Provider availability — online/offline, service radius and weekly working
// hours. The hours are what the customer's booking form offers: a day off
// shows no slots, and times outside the hours are closed with "Off hours".
// ============================================

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchProviderProfile,
  updateProviderOnlineStatus,
  updateProviderProfile,
} from '../../../../networks/serviceProviders/providerNetwork';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';
import { AppBar, Button, Card, Chip, Screen, TimeField } from '../../../../components/ui';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30];

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
interface DayHours {
  key: DayKey;
  day: string;
  available: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
}
const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '20:00';

/** The week as the server sent it (GET /provider/profile → availability[]). */
function toWeek(raw: any[]): DayHours[] {
  return DAY_KEYS.map((key) => {
    const d = (raw || []).find((x) => (x?.key || String(x?.day || '').toLowerCase()) === key) || {};
    return {
      key,
      day: key[0].toUpperCase() + key.slice(1),
      available: d.available !== false,
      start: /^\d{2}:\d{2}$/.test(d.start || '') ? d.start : DEFAULT_START,
      end: /^\d{2}:\d{2}$/.test(d.end || '') ? d.end : DEFAULT_END,
    };
  });
}

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
  const [week, setWeek] = useState<DayHours[]>(toWeek([]));
  const [savedWeek, setSavedWeek] = useState<string>('');
  const weekDirty = JSON.stringify(week) !== savedWeek;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchProviderProfile();
    if (res.success && res.data) {
      setIsOnline(!!res.data.isOnline);
      setRadius((res.data as any).serviceRadius || 15);
      const loaded = toWeek((res.data as any).availability || []);
      setWeek(loaded);
      setSavedWeek(JSON.stringify(loaded));
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

  const updateDay = (key: DayKey, patch: Partial<DayHours>) =>
    setWeek((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const saveWeek = async () => {
    const bad = week.find((d) => d.available && d.start >= d.end);
    if (bad) {
      setError(`On ${bad.day}, the start time must be before the end time.`);
      return;
    }
    const availability = Object.fromEntries(
      week.map((d) => [
        d.key,
        d.available ? { isAvailable: true, start: d.start, end: d.end } : { isAvailable: false },
      ])
    );
    setSaving(true);
    const res = await updateProviderProfile({ availability } as any);
    setSaving(false);
    if (!res.success) {
      setError(res.message || 'Failed to save your working hours');
      return;
    }
    setError(null);
    setSavedWeek(JSON.stringify(week));
    flashSaved('Working hours saved');
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
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
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
                    ? 'Customers see you are online and ready for jobs.'
                    : 'Customers see you as offline. They can still book ahead, and you are notified.'}
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
              How far you will travel for a job. Customers farther away than this
              don't see you when they search near their address.
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

          {/* Working hours — what the booking form offers customers. */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Working hours</Text>
            <Text style={styles.cardSub}>
              Customers can only book you on your working days, inside these hours.
            </Text>
            {week.map((d) => (
              <View key={d.key} style={styles.dayRow}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayName}>{d.day}</Text>
                  <Text style={styles.daySub}>{d.available ? 'Working' : 'Day off'}</Text>
                  <Switch
                    value={d.available}
                    onValueChange={(v) => updateDay(d.key, { available: v })}
                    trackColor={{ false: colors.disabled, true: colors.accentLine }}
                    thumbColor={d.available ? colors.accent : colors.lineSoft}
                    disabled={saving}
                    accessibilityLabel={`${d.day} working`}
                  />
                </View>
                {d.available && (
                  <View style={styles.dayTimes}>
                    <TimeField
                      label="From"
                      value={d.start}
                      onChange={(v) => updateDay(d.key, { start: v })}
                      disabled={saving}
                      style={styles.timeField}
                    />
                    <TimeField
                      label="To"
                      value={d.end}
                      onChange={(v) => updateDay(d.key, { end: v })}
                      disabled={saving}
                      style={styles.timeField}
                    />
                  </View>
                )}
              </View>
            ))}
            <Button
              label={weekDirty ? 'Save working hours' : 'Saved'}
              onPress={saveWeek}
              disabled={!weekDirty || saving}
              loading={saving && weekDirty}
              style={styles.saveBtn}
            />
          </Card>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkMuted} />
            <Text style={styles.hintText}>
              Being online adds an availability bonus to your matching score, so you
              appear higher when customers search.
            </Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  body: { padding: GUTTER, paddingBottom: S.huge },
  dayRow: {
    paddingVertical: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.lineSoft,
  },
  dayHead: { flexDirection: 'row', alignItems: 'center' },
  dayName: { ...T.bodyStrong, color: c.ink, width: 104 },
  daySub: { ...T.caption, color: c.inkMuted, flex: 1 },
  dayTimes: { flexDirection: 'row', marginTop: S.sm },
  timeField: { flex: 1, marginRight: S.sm },
  saveBtn: { marginTop: S.md },
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
