import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppointmentRow from '../../../../components/Healthcare/doctor/AppointmentRow';
import ActionSheet, { SheetOption } from '../../../../components/ui/ActionSheet';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SegmentedControl,
  SkeletonCard,
  ToneBadge,
} from '../../../../components/ui';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { DoctorAppointment, PatientSummary } from '../../../../models/healthcare/doctorHub';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  consultationIcon,
  consultationLabel,
  formatDateLabel,
  formatTimeRange,
  isLiveWindow,
  relativeStart,
  uses24HourClock,
} from '../../../../utils/healthcare/doctorFormat';
import { dateKeyOf, todayDateKey } from '../../../../utils/healthcare/timeRanges';
import { fetchPatients, fetchToday } from './patientQueueSlice';

// ============================================================================
// Patients: today's list, and everyone you have seen.
//
// "Patients" was two screens with confusingly similar names — a tab titled
// "Patient Queue" and a "My Patients" tile that opened something else. The
// current patient's card squeezed five equal buttons into one row; it now has
// one clear next step and the rest in a menu.
// ============================================================================

type Segment = 'today' | 'all';

const POLL_MS = 30000;
const STALE_MS = 30000;

const CurrentCard: React.FC<{
  appointment: DoctorAppointment;
  uses24h: boolean;
  onPrimary: () => void;
  onMore: () => void;
  onOpen: () => void;
}> = ({ appointment: a, uses24h, onPrimary, onMore, onOpen }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const live = isLiveWindow(a.startUtc, a.endUtc);

  return (
    <Card elevation="raised" accentRule={live ? colors.success : colors.accent} onPress={onOpen} style={styles.current}>
      <View style={styles.currentTop}>
        <Text style={[styles.currentWhen, live && { color: colors.success }]}>
          {live ? 'Now' : relativeStart(a.startUtc, a.endUtc) || 'Next'}
        </Text>
        <ToneBadge label={consultationLabel(a.type)} icon={consultationIcon(a.type)} tone={a.type === 'video' ? 'info' : 'accent'} />
      </View>
      <View style={styles.currentPatient}>
        <Avatar uri={a.patientPhoto} name={a.patientName} size={44} />
        <View style={styles.currentText}>
          <Text style={styles.currentName} numberOfLines={1}>
            {a.patientName}
          </Text>
          <Text style={styles.caption}>{formatTimeRange(a.startTime, a.endTime, uses24h)}</Text>
        </View>
      </View>
      {!!a.symptoms && (
        <Text style={styles.body} numberOfLines={2}>
          {a.symptoms}
        </Text>
      )}
      <View style={styles.currentActions}>
        <Button
          label={a.type === 'video' ? 'Join video call' : 'Open consultation'}
          icon={a.type === 'video' ? 'videocam-outline' : 'clipboard-outline'}
          onPress={onPrimary}
          fullWidth={false}
          style={styles.flex}
        />
        <TouchableOpacity onPress={onMore} style={styles.moreButton} accessibilityRole="button" accessibilityLabel="More actions">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const PatientRow: React.FC<{ patient: PatientSummary; divider: boolean; onPress: () => void }> = React.memo(
  ({ patient, divider, onPress }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const last = patient.lastVisit ? formatDateLabel(dateKeyOf(new Date(patient.lastVisit)), { weekday: false, year: true }) : '';
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.patientRow, divider && styles.divider]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${patient.name}, ${patient.appointmentCount} visits`}
      >
        <Avatar uri={patient.profilePhoto} name={patient.name} size={40} />
        <View style={styles.patientText}>
          <Text style={styles.strong} numberOfLines={1}>
            {patient.name}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {[last ? `Last visit ${last}` : '', `${patient.appointmentCount} visit${patient.appointmentCount === 1 ? '' : 's'}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
      </TouchableOpacity>
    );
  }
);

const PatientQueueScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const uses24h = useMemo(uses24HourClock, []);
  const listRef = useRef<any>(null);
  useScrollToTop(listRef);

  const [segment, setSegment] = useState<Segment>(route.params?.segment === 'all' ? 'all' : 'today');
  const [search, setSearch] = useState('');
  const [menuFor, setMenuFor] = useState<DoctorAppointment | null>(null);

  const q = useAppSelector((s) => s.patientQueue);

  useEffect(() => {
    if (route.params?.segment === 'all' || route.params?.segment === 'today') setSegment(route.params.segment);
  }, [route.params?.segment]);

  // ── Today: load when stale on focus, then poll while visible ──
  useFocusEffect(
    useCallback(() => {
      if (!q.lastFetchedAt || Date.now() - q.lastFetchedAt > STALE_MS || q.todayKey !== todayDateKey()) {
        dispatch(fetchToday());
      }
      let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
        dispatch(fetchToday({ silent: true }));
      }, POLL_MS);
      // No polling in the background: a phone in a pocket should not keep
      // asking the server who is waiting.
      const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active' && !timer) {
          dispatch(fetchToday({ silent: true }));
          timer = setInterval(() => dispatch(fetchToday({ silent: true })), POLL_MS);
        } else if (next !== 'active' && timer) {
          clearInterval(timer);
          timer = null;
        }
      });
      return () => {
        if (timer) clearInterval(timer);
        sub.remove();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch])
  );

  // ── All patients: debounced search ──
  useEffect(() => {
    if (segment !== 'all') return undefined;
    const handle = setTimeout(() => {
      if (search.trim() !== q.query || q.patientsStatus === 'idle') {
        dispatch(fetchPatients({ query: search.trim(), page: 1 }));
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, search, segment]);

  const openAppointment = useCallback(
    (a: DoctorAppointment) => navigation.navigate(DoctorRouteNames.AppointmentDetail, { appointmentId: a.id }),
    [navigation]
  );

  const startConsultation = (a: DoctorAppointment) => {
    if (a.type === 'video') {
      navigation.navigate('HealthcareConsultCall', {
        roomId: a.id,
        appointmentId: a.id,
        roomType: 'healthcare',
        media: 'video',
        counterpartName: a.patientName,
      });
    } else {
      navigation.navigate(DoctorRouteNames.ConsultationNotes, {
        appointmentId: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
      });
    }
  };

  const menuOptions = (a: DoctorAppointment): SheetOption[] => [
    { label: 'Appointment details', icon: 'document-text-outline', onPress: () => openAppointment(a) },
    {
      label: 'Visit history',
      icon: 'time-outline',
      onPress: () => navigation.navigate(DoctorRouteNames.PatientHistory, { patientId: a.patientId, patientName: a.patientName }),
    },
    {
      label: 'Message',
      icon: 'chatbubble-ellipses-outline',
      onPress: () => navigation.navigate('DoctorConsultChat', { appointmentId: a.id, patientName: a.patientName }),
    },
    {
      label: 'Voice call',
      icon: 'call-outline',
      onPress: () =>
        navigation.navigate('HealthcareConsultCall', {
          appointmentId: a.id,
          roomType: 'healthcare',
          media: 'audio',
          counterpartName: a.patientName,
        }),
    },
  ];

  // ── Today sections ──
  const now = new Date();
  const confirmed = q.today.filter((a) => a.status === 'confirmed');
  const current =
    confirmed.find((a) => isLiveWindow(a.startUtc, a.endUtc, now)) ??
    confirmed.find((a) => !!a.endUtc && new Date(a.endUtc) > now) ??
    null;
  const sections = [
    { key: 'requests', title: 'Waiting for approval', data: q.today.filter((a) => a.status === 'pending') },
    {
      key: 'upcoming',
      title: 'Up next',
      data: confirmed.filter((a) => a.id !== current?.id && (!a.endUtc || new Date(a.endUtc) > now)),
    },
    {
      key: 'seen',
      title: 'Seen',
      data: q.today.filter(
        (a) => a.status === 'completed' || (a.status === 'confirmed' && !!a.endUtc && new Date(a.endUtc) <= now && a.id !== current?.id)
      ),
    },
  ].filter((section) => section.data.length > 0);

  const segmentControl = (
    <View style={styles.segment}>
      <SegmentedControl<Segment>
        options={[
          { value: 'today', label: 'Today', count: q.today.length || undefined },
          { value: 'all', label: 'All patients' },
        ]}
        value={segment}
        onChange={setSegment}
      />
    </View>
  );

  const renderToday = () => {
    if (q.todayStatus !== 'ready' && q.todayStatus !== 'error') {
      return (
        <View style={styles.content}>
          {segmentControl}
          <SkeletonCard lines={3} />
        </View>
      );
    }
    return (
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={q.todayRefreshing}
            onRefresh={() => dispatch(fetchToday({ refresh: true }))}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View>
            {segmentControl}
            {!!q.todayError && q.todayStatus === 'ready' && (
              <Text style={styles.stale}>Couldn't refresh. Pull down to try again.</Text>
            )}
            {current && (
              <CurrentCard
                appointment={current}
                uses24h={uses24h}
                onOpen={() => openAppointment(current)}
                onPrimary={() => startConsultation(current)}
                onMore={() => setMenuFor(current)}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          q.todayStatus === 'error' ? (
            <ErrorState message={q.todayError} onRetry={() => dispatch(fetchToday())} />
          ) : current ? null : (
            <Card>
              <EmptyState
                icon="people-outline"
                title="No patients today"
                message="Today's appointments appear here as patients book."
              />
            </Card>
          )
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>
            {section.title} · {section.data.length}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View style={[styles.rowCard, index === 0 && styles.rowFirst, index === section.data.length - 1 && styles.rowLast]}>
            <AppointmentRow appointment={item} onPress={openAppointment} uses24h={uses24h} divider={index > 0} />
          </View>
        )}
        ListFooterComponent={<View style={styles.bottomSpace} />}
      />
    );
  };

  const renderAll = () => (
    <FlatList
      ref={listRef}
      data={q.patients}
      keyExtractor={(item) => item.patientId}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={q.patientsStatus === 'loading' && q.patients.length > 0}
          onRefresh={() => dispatch(fetchPatients({ query: search.trim(), page: 1 }))}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      ListHeaderComponent={
        <View>
          {segmentControl}
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.inkFaint} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name"
              placeholderTextColor={colors.inkFaint}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search patients by name"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}>
                <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      }
      ListEmptyComponent={
        q.patientsStatus === 'loading' || q.patientsStatus === 'idle' ? (
          <SkeletonCard lines={2} />
        ) : q.patientsStatus === 'error' ? (
          <ErrorState message={q.patientsError} onRetry={() => dispatch(fetchPatients({ query: search.trim(), page: 1 }))} />
        ) : (
          <EmptyState
            icon="people-outline"
            title={search ? `No patients match "${search}"` : 'No patients yet'}
            message={search ? 'Check the spelling, or search by first name.' : 'Patients you see appear here.'}
          />
        )
      }
      renderItem={({ item, index }) => (
        <View style={[styles.rowCard, index === 0 && styles.rowFirst, index === q.patients.length - 1 && styles.rowLast]}>
          <PatientRow
            patient={item}
            divider={index > 0}
            onPress={() => navigation.navigate(DoctorRouteNames.PatientHistory, { patientId: item.patientId, patientName: item.name })}
          />
        </View>
      )}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (q.hasMore && !q.loadingMore && q.patientsStatus === 'ready') {
          dispatch(fetchPatients({ query: q.query, page: q.page + 1 }));
        }
      }}
      ListFooterComponent={<View style={styles.bottomSpace} />}
    />
  );

  return (
    <Screen>
      <AppBar title="Patients" hideBack />
      {segment === 'today' ? renderToday() : renderAll()}
      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.patientName}
        options={menuFor ? menuOptions(menuFor) : []}
        onClose={() => setMenuFor(null)}
      />
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.md },
    segment: { marginBottom: S.lg },
    stale: { ...T.caption, color: c.warning, marginBottom: S.sm },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    body: { ...T.body, color: c.ink, marginTop: S.md },
    strong: { ...T.bodyStrong, color: c.ink },
    current: { marginBottom: S.sm },
    currentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    currentWhen: { ...T.label, color: c.accentDeep },
    currentPatient: { flexDirection: 'row', alignItems: 'center', marginTop: S.md },
    currentText: { flex: 1, marginLeft: S.md },
    currentName: { ...T.subhead, color: c.ink },
    currentActions: { flexDirection: 'row', alignItems: 'center', marginTop: S.lg },
    moreButton: {
      width: 46,
      height: 46,
      marginLeft: S.sm,
      borderRadius: R.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: { ...T.label, color: c.inkMuted, marginTop: S.lg, marginBottom: S.sm },
    rowCard: {
      backgroundColor: c.surface,
      paddingHorizontal: S.lg,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: R.card, borderTopRightRadius: R.card },
    rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: R.card, borderBottomRightRadius: R.card },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    patientRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: S.md },
    patientText: { flex: 1, marginHorizontal: S.md },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 46,
      borderRadius: R.control,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      paddingHorizontal: S.md,
      marginBottom: S.md,
    },
    searchInput: { ...T.body, color: c.ink, flex: 1, marginLeft: S.sm, paddingVertical: S.sm },
    clear: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    bottomSpace: { height: S.huge * 2 },
  });

export default PatientQueueScreen;
