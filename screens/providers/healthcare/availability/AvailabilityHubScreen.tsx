import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBar, ErrorState, Screen, SegmentedControl, SkeletonCard, showToast } from '../../../../components/ui';
import { GUTTER, S } from '../../../../constants/theme';
import { useAppDispatch } from '../../../../hooks/useReduxHooks';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';
import type { AvailabilityHub, BookingSettings, HubClinic } from '../../../../models/healthcare/doctorHub';
import { fetchAvailabilityHub } from '../../../../networks/healthcare/doctorHubApi';
import { ThemeColors, useTheme } from '../../../../theme';
import { EditableDay, normalizeWeek } from '../../../../utils/healthcare/timeRanges';
import { fetchDashboard } from '../doctor-home/doctorDashboardSlice';
import CalendarSection from './CalendarSection';
import TimeOffSection from './TimeOffSection';
import WeeklyHoursSection from './WeeklyHoursSection';

// ============================================================================
// Availability: one place for when a doctor can be booked.
//
// It replaces two screens that described the same thing twice — "Availability"
// (a weekly template) and "Manage Slots" (one day's slots) — which could not see
// each other: slots added by hand were invisible to the template, so the
// template generated duplicates on top of them.
//
// The weekly-hours draft lives here, above the sections, so switching to the
// calendar to check a day does not throw away an unsaved edit.
// ============================================================================

export type HubSection = 'weekly' | 'calendar' | 'timeOff';

const snapshot = (week: EditableDay[], settings: BookingSettings | null) => JSON.stringify({ week, settings });

const AvailabilityHubScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const [section, setSection] = useState<HubSection>(route.params?.section ?? 'weekly');
  const [hub, setHub] = useState<AvailabilityHub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<EditableDay[]>([]);
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const baseline = useRef('');

  const resetDraft = useCallback((next: AvailabilityHub) => {
    const normalized = normalizeWeek(next.weeklyAvailability);
    setWeek(normalized);
    setSettings(next.settings);
    baseline.current = snapshot(normalized, next.settings);
  }, []);

  const load = useCallback(
    async ({ keepDraft = false }: { keepDraft?: boolean } = {}) => {
      const res = await fetchAvailabilityHub();
      if (!res.success) {
        setError(res.message || "We couldn't load your availability");
        if (keepDraft) showToast({ message: res.message || "We couldn't refresh your availability", tone: 'error' });
        return;
      }
      setError(null);
      setHub(res.data);
      if (!keepDraft) resetDraft(res.data);
    },
    [resetDraft]
  );

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!settings && snapshot(week, settings) !== baseline.current;
  const { sheet, allowLeave } = useUnsavedChangesGuard(dirty, {
    message: 'Your weekly hours have changes that have not been saved.',
  });

  const refreshDashboard = useCallback(() => {
    dispatch(fetchDashboard({ refresh: true }));
  }, [dispatch]);

  const onApplied = useCallback(async () => {
    allowLeave();
    await load();
    refreshDashboard();
  }, [allowLeave, load, refreshDashboard]);

  const onClinicAdded = useCallback((clinic: HubClinic) => {
    setHub((h) => (h ? { ...h, clinics: [...h.clinics, clinic] } : h));
  }, []);

  const body = () => {
    if (!hub || !settings) {
      if (error) return <ErrorState message={error} onRetry={() => load()} />;
      return (
        <View style={styles.pad}>
          <SkeletonCard lines={2} />
          <View style={styles.gap} />
          <SkeletonCard lines={4} />
        </View>
      );
    }
    if (section === 'weekly') {
      return (
        <WeeklyHoursSection
          hub={hub}
          week={week}
          settings={settings}
          dirty={dirty}
          onWeekChange={setWeek}
          onSettingsChange={setSettings}
          onDiscard={() => resetDraft(hub)}
          onApplied={onApplied}
          onClinicAdded={onClinicAdded}
          onReloadHub={() => load()}
        />
      );
    }
    if (section === 'calendar') {
      return (
        <CalendarSection
          hub={hub}
          initialDate={route.params?.date}
          onOpenTimeOff={() => setSection('timeOff')}
          onChanged={refreshDashboard}
        />
      );
    }
    return (
      <TimeOffSection
        hub={hub}
        onChanged={() => {
          load({ keepDraft: true });
          refreshDashboard();
        }}
      />
    );
  };

  return (
    <Screen>
      <AppBar title="Availability" onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        <SegmentedControl
          options={[
            { value: 'weekly', label: 'Weekly hours' },
            { value: 'calendar', label: 'Calendar' },
            { value: 'timeOff', label: 'Time off', count: hub?.timeOff.length },
          ]}
          value={section}
          onChange={setSection}
        />
      </View>
      {body()}
      {sheet}
    </Screen>
  );
};

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    tabs: { paddingHorizontal: GUTTER, paddingTop: S.md },
    pad: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    gap: { height: S.md },
  });

export default AvailabilityHubScreen;
