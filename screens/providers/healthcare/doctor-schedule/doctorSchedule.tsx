import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AppointmentRow from '../../../../components/Healthcare/doctor/AppointmentRow';
import {
  AppBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SegmentedControl,
  SkeletonCard,
} from '../../../../components/ui';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { DoctorAppointment } from '../../../../models/healthcare/doctorHub';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  dateFromKey,
  formatDateLabel,
  formatDayHeading,
  formatMonthYear,
  uses24HourClock,
  WEEKDAYS_SHORT,
} from '../../../../utils/healthcare/doctorFormat';
import { addDaysToKey, todayDateKey, weekOf } from '../../../../utils/healthcare/timeRanges';
import { fetchRequests, fetchWeek, ScheduleView, selectDate, setView } from './doctorScheduleSlice';

// ============================================================================
// Schedule: appointments by day or week, and the requests waiting for approval.
//
// Every row opens the appointment. It used to open the patient's history, with
// Approve and Decline buttons squeezed inside a card that was itself tappable.
// ============================================================================

const STALE_MS = 30000;

const DoctorScheduleScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const listRef = useRef<any>(null);
  useScrollToTop(listRef);
  const uses24h = useMemo(uses24HourClock, []);
  const today = todayDateKey();

  const {
    view,
    selectedDate,
    weekStart,
    appointments,
    loadedWeek,
    status,
    refreshing,
    error,
    lastFetchedAt,
    requests,
    requestsStatus,
    requestsError,
  } = useAppSelector((s) => s.doctorSchedule);
  const pendingCount = useAppSelector((s) => s.doctorDashboard.data?.pendingRequests ?? 0);

  // A date handed over from elsewhere (Home, a notification).
  useEffect(() => {
    const date = route.params?.date;
    if (typeof date === 'string' && dateFromKey(date)) dispatch(selectDate(date));
  }, [dispatch, route.params?.date]);

  const load = useCallback(
    (refresh = false) => {
      dispatch(fetchWeek({ weekStart, refresh }));
      dispatch(fetchRequests());
    },
    [dispatch, weekStart]
  );

  // Refetch on focus only when stale; a new week always loads.
  useFocusEffect(
    useCallback(() => {
      const stale = !lastFetchedAt || Date.now() - lastFetchedAt > STALE_MS;
      if (loadedWeek !== weekStart || stale) load();
    }, [load, lastFetchedAt, loadedWeek, weekStart])
  );

  const openAppointment = useCallback(
    (a: DoctorAppointment) => navigation.navigate(DoctorRouteNames.AppointmentDetail, { appointmentId: a.id }),
    [navigation]
  );

  const days = weekOf(weekStart);
  const countByDay = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      map[a.dateKey] = (map[a.dateKey] || 0) + 1;
    });
    return map;
  }, [appointments]);

  const sections = useMemo(() => {
    if (view === 'requests') {
      return requests.length ? [{ key: 'requests', title: '', data: requests }] : [];
    }
    if (view === 'day') {
      const data = appointments.filter((a) => a.dateKey === selectedDate);
      return data.length ? [{ key: selectedDate, title: '', data }] : [];
    }
    return days
      .map((key) => ({ key, title: formatDayHeading(key, today), data: appointments.filter((a) => a.dateKey === key) }))
      .filter((section) => section.data.length > 0);
  }, [view, requests, appointments, selectedDate, days, today]);

  const shiftWeek = (weeks: number) => {
    const start = addDaysToKey(weekStart, weeks * 7);
    dispatch(selectDate(weekOf(start).includes(today) ? today : start));
  };

  const loadingFirst = view === 'requests' ? requestsStatus === 'loading' && !requests.length : status !== 'ready' && status !== 'error';
  const failed = view === 'requests' ? requestsStatus === 'error' : status === 'error';

  const header = (
    <View>
      <SegmentedControl<ScheduleView>
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'requests', label: 'Requests', count: Math.max(pendingCount, requests.length) },
        ]}
        value={view}
        onChange={(v) => dispatch(setView(v))}
      />

      {view !== 'requests' && (
        <>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => shiftWeek(-1)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Previous week">
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.month}>{formatMonthYear(view === 'day' ? selectedDate : weekStart)}</Text>
            <TouchableOpacity onPress={() => shiftWeek(1)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Next week">
              <Ionicons name="chevron-forward" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.strip}>
            {days.map((key) => {
              const date = dateFromKey(key);
              const selected = view === 'day' && key === selectedDate;
              const count = countByDay[key] || 0;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    dispatch(selectDate(key));
                    if (view !== 'day') dispatch(setView('day'));
                  }}
                  style={[styles.pill, selected && styles.pillSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${formatDateLabel(key)}, ${count} appointment${count === 1 ? '' : 's'}`}
                >
                  <Text style={[styles.pillWeekday, selected && styles.pillTextSelected]}>
                    {date ? WEEKDAYS_SHORT[date.getDay()] : ''}
                  </Text>
                  <Text style={[styles.pillDate, key === today && styles.pillToday, selected && styles.pillTextSelected]}>
                    {date?.getDate()}
                  </Text>
                  <Text style={[styles.pillCount, !count && styles.pillCountEmpty]}>{count || '·'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {view === 'day' && <Text style={styles.dayTitle}>{formatDayHeading(selectedDate, today)}</Text>}
      {view === 'requests' && (
        <Text style={styles.hint}>Approve or decline each request so the patient knows where they stand.</Text>
      )}

      {!!error && view !== 'requests' && status === 'ready' && (
        <Text style={styles.staleText}>Couldn't refresh. Pull down to try again.</Text>
      )}
      {!!requestsError && view === 'requests' && requestsStatus === 'ready' && (
        <Text style={styles.staleText}>Couldn't refresh. Pull down to try again.</Text>
      )}
    </View>
  );

  const empty = () => {
    if (loadingFirst) {
      return (
        <View>
          <SkeletonCard lines={1} />
          <View style={styles.gap} />
          <SkeletonCard lines={1} />
        </View>
      );
    }
    if (failed) return <ErrorState message={view === 'requests' ? requestsError : error} onRetry={() => load()} />;
    if (view === 'requests') {
      return <EmptyState icon="checkmark-done-outline" title="No requests waiting" message="New booking requests appear here." />;
    }
    return (
      <Card>
        <EmptyState
          icon="calendar-clear-outline"
          title={view === 'day' ? `No appointments on ${formatDateLabel(selectedDate)}` : 'No appointments this week'}
          message="Check your open slots, or add hours for a day."
          actionLabel="Open calendar"
          onAction={() =>
            navigation.navigate(DoctorRouteNames.AvailabilityHub, {
              section: 'calendar',
              date: view === 'day' ? selectedDate : weekStart,
            })
          }
        />
      </Card>
    );
  };

  return (
    <Screen>
      <AppBar
        title="Schedule"
        hideBack
        right={
          selectedDate !== today || view === 'requests' ? (
            <Button
              label="Today"
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => {
                dispatch(selectDate(today));
                dispatch(setView('day'));
              }}
            />
          ) : undefined
        }
      />
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} />
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.sectionTitle}>
              {section.title} · {section.data.length}
            </Text>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.rowCard,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
            ]}
          >
            <AppointmentRow
              appointment={item}
              onPress={openAppointment}
              showDate={view === 'requests'}
              todayKey={today}
              uses24h={uses24h}
              divider={index > 0}
            />
          </View>
        )}
        ListFooterComponent={<View style={styles.bottomSpace} />}
      />
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.md },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.md },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    month: { ...T.subhead, color: c.ink },
    strip: { flexDirection: 'row', marginBottom: S.sm },
    pill: { flex: 1, alignItems: 'center', paddingVertical: S.sm, marginHorizontal: 2, borderRadius: R.control, minHeight: 64 },
    pillSelected: { backgroundColor: c.accentSoft },
    pillWeekday: { ...T.caption, color: c.inkMuted },
    pillDate: { ...T.subhead, color: c.ink, marginTop: 2 },
    pillToday: { color: c.accentDeep },
    pillTextSelected: { color: c.accentDeep },
    pillCount: { ...T.micro, color: c.accentDeep, marginTop: 2 },
    pillCountEmpty: { color: c.inkFaint },
    dayTitle: { ...T.heading, color: c.ink, marginTop: S.md, marginBottom: S.md },
    hint: { ...T.body, color: c.inkMuted, marginTop: S.md, marginBottom: S.md },
    staleText: { ...T.caption, color: c.warning, marginBottom: S.sm },
    sectionTitle: { ...T.label, color: c.inkMuted, marginTop: S.lg, marginBottom: S.sm },
    rowCard: {
      backgroundColor: c.surface,
      paddingHorizontal: S.lg,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    rowFirst: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopLeftRadius: R.card,
      borderTopRightRadius: R.card,
    },
    rowLast: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: R.card,
      borderBottomRightRadius: R.card,
    },
    gap: { height: S.md },
    bottomSpace: { height: S.huge * 2 },
  });

export default DoctorScheduleScreen;
