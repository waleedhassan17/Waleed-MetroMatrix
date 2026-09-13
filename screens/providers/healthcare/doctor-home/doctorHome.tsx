import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvailabilityWarning from '../../../../components/Healthcare/AvailabilityWarning';
import AppointmentRow from '../../../../components/Healthcare/doctor/AppointmentRow';
import MiniWalletCard from '../../../../components/MiniWalletCard/MiniWalletCard';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  StatTile,
  ToneBadge,
  showToast,
} from '../../../../components/ui';
import { APP_CURRENCY, formatMoney } from '../../../../constants/Currency';
import { GUTTER, R, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { useStaleWhileFocus } from '../../../../hooks/useStaleWhileFocus';
import type { DoctorAppointment } from '../../../../models/healthcare/doctorHub';
import { DoctorRouteNames, DoctorTabNames } from '../../../../navigation-maps/Healthcare';
import { selectTotalUnread } from '../../../../store/unreadSlice';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  consultationIcon,
  consultationLabel,
  formatDuration,
  formatTimeRange,
  greeting,
  isLiveWindow,
  minutesBetween,
  relativeStart,
  uses24HourClock,
} from '../../../../utils/healthcare/doctorFormat';
import { todayDateKey } from '../../../../utils/healthcare/timeRanges';
import { extendAvailability, fetchDashboard } from './doctorDashboardSlice';

// ============================================================================
// Doctor Home — what needs attention today, in the order it needs it:
// availability problems, the next patient, requests, the rest of today, money.
//
// It replaces a screen with a native-Alert account menu, a 10-tile grid that
// repeated the tab bar, a "Live" badge on appointments hours away, a
// hardcoded "30 min", and a "Today's Schedule" that could only ever show one
// appointment because the server only sent one.
// ============================================================================

const TODAY_PREVIEW = 5;

const HomeHeader: React.FC<{ name: string; onAccount: () => void; onNotifications: () => void }> = ({
  name,
  onAccount,
  onNotifications,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
      <TouchableOpacity onPress={onAccount} accessibilityRole="button" accessibilityLabel="Account">
        <Avatar name={name} size={44} tint={colors.accentSoft} color={colors.accentDeep} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
          {name || 'Doctor'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onNotifications}
        style={styles.iconButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={22} color={colors.ink} />
      </TouchableOpacity>
    </View>
  );
};

const NextUpCard: React.FC<{
  appointment: DoctorAppointment;
  uses24h: boolean;
  onOpen: () => void;
  onPrimary: () => void;
}> = ({ appointment: a, uses24h, onOpen, onPrimary }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const live = isLiveWindow(a.startUtc, a.endUtc);
  const when = live ? 'Now' : relativeStart(a.startUtc, a.endUtc) || 'Next';
  const duration = formatDuration(minutesBetween(a.startTime, a.endTime));
  const primary =
    a.status === 'pending'
      ? { label: 'Review request', icon: 'document-text-outline' }
      : a.type === 'video'
        ? { label: 'Join video call', icon: 'videocam-outline' }
        : { label: 'Open consultation', icon: 'clipboard-outline' };

  return (
    <Card elevation="raised" accentRule={colors.accent} onPress={onOpen} accessibilityLabel={`Next: ${a.patientName}`}>
      <View style={styles.nextTop}>
        <Text style={[styles.nextWhen, live && { color: colors.success }]}>{when}</Text>
        <ToneBadge
          label={consultationLabel(a.type)}
          icon={consultationIcon(a.type)}
          tone={a.type === 'video' ? 'info' : 'accent'}
        />
      </View>
      <Text style={styles.nextName} numberOfLines={1}>
        {a.patientName}
      </Text>
      <Text style={styles.nextMeta} numberOfLines={1}>
        {[formatTimeRange(a.startTime, a.endTime, uses24h), duration, a.type === 'in-clinic' ? a.clinic?.name : '']
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {!!a.symptoms && (
        <Text style={styles.nextSymptoms} numberOfLines={2}>
          {a.symptoms}
        </Text>
      )}
      <Button label={primary.label} icon={primary.icon} onPress={onPrimary} style={styles.nextButton} />
    </Card>
  );
};

const HomeSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <View style={styles.stats}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="auto" height={72} radius={R.card} style={styles.skeletonTile} />
        ))}
      </View>
      <View style={styles.section}>
        <SkeletonCard lines={2} />
      </View>
      <View style={styles.section}>
        <SkeletonCard lines={3} />
      </View>
    </View>
  );
};

const DoctorHomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const uses24h = useMemo(uses24HourClock, []);

  const { data, availability, status, refreshing, error, lastFetchedAt, extending } = useAppSelector(
    (s) => s.doctorDashboard
  );
  const unread = useAppSelector(selectTotalUnread);

  const load = useCallback(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);
  useStaleWhileFocus(load, lastFetchedAt, 30000);

  const onRefresh = useCallback(() => {
    dispatch(fetchDashboard({ refresh: true }));
  }, [dispatch]);

  const goTab = (screen: string) => navigation.navigate(DoctorRouteNames.DoctorTabs, { screen });
  const openAppointment = useCallback(
    (a: DoctorAppointment) => navigation.navigate(DoctorRouteNames.AppointmentDetail, { appointmentId: a.id }),
    [navigation]
  );

  const startNext = (a: DoctorAppointment) => {
    if (a.status === 'pending') {
      openAppointment(a);
    } else if (a.type === 'video') {
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

  const onExtend = async () => {
    try {
      await dispatch(extendAvailability()).unwrap();
      showToast({ message: 'Availability extended', tone: 'success' });
    } catch (e) {
      showToast({ message: typeof e === 'string' ? e : "We couldn't extend your availability", tone: 'error' });
    }
  };

  const today = todayDateKey();
  const todayList = data?.todayAppointments ?? [];
  const next = data?.nextAppointment ?? null;

  const content = () => {
    if (!data) {
      if (status === 'error') return <ErrorState message={error} onRetry={load} />;
      return <HomeSkeleton />;
    }

    const active = data.today.appointments - data.today.cancelled;
    const money = [
      { label: 'Today', amount: data.today.earnings },
      { label: 'This week', amount: data.thisWeek.earnings },
      { label: 'This month', amount: data.thisMonth.earnings },
    ];

    return (
      <>
        {!!error && (
          <Card style={styles.staleBanner}>
            <View style={styles.staleRow}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
              <Text style={styles.staleText}>Couldn't refresh. Showing what was loaded earlier.</Text>
              <Button label="Retry" size="sm" variant="ghost" fullWidth={false} onPress={onRefresh} />
            </View>
          </Card>
        )}

        {availability && availability.state !== 'ok' && (
          <AvailabilityWarning
            status={availability}
            extending={extending}
            onSetUp={() => navigation.navigate(DoctorRouteNames.AvailabilityHub)}
            onExtend={onExtend}
          />
        )}

        <View style={styles.stats}>
          <StatTile value={active} label="Today" onPress={() => goTab(DoctorTabNames.Schedule)} />
          <StatTile
            value={data.pendingRequests}
            label="Requests"
            tone={data.pendingRequests ? 'warning' : 'neutral'}
            onPress={() => goTab(DoctorTabNames.Schedule)}
          />
          <StatTile value={data.today.completed} label="Seen" />
          <StatTile value={data.today.cancelled} label="Cancelled" />
        </View>

        {next && (
          <View style={styles.section}>
            <SectionHeader title="Next up" />
            <NextUpCard
              appointment={next}
              uses24h={uses24h}
              onOpen={() => openAppointment(next)}
              onPrimary={() => startNext(next)}
            />
          </View>
        )}

        {data.pendingRequests > 0 && (
          <Card style={styles.section} onPress={() => goTab(DoctorTabNames.Schedule)}>
            <ListRow
              icon="hourglass-outline"
              tone="accent"
              title={`${data.pendingRequests} request${data.pendingRequests === 1 ? '' : 's'} waiting`}
              subtitle="Approve or decline so patients know where they stand"
              onPress={() => goTab(DoctorTabNames.Schedule)}
            />
          </Card>
        )}

        <View style={styles.section}>
          <SectionHeader
            title="Today"
            subtitle={active ? `${active} appointment${active === 1 ? '' : 's'}` : undefined}
            actionLabel={todayList.length ? 'See all' : undefined}
            onAction={() => goTab(DoctorTabNames.Schedule)}
          />
          {todayList.length === 0 ? (
            <Card>
              <EmptyState
                icon="calendar-clear-outline"
                title="No appointments today"
                message="Patients can book any open time in your weekly hours."
                actionLabel="Manage availability"
                onAction={() => navigation.navigate(DoctorRouteNames.AvailabilityHub)}
                style={styles.empty}
              />
            </Card>
          ) : (
            <Card padded={false} style={styles.listCard}>
              {todayList.slice(0, TODAY_PREVIEW).map((a, i) => (
                <AppointmentRow
                  key={a.id}
                  appointment={a}
                  onPress={openAppointment}
                  uses24h={uses24h}
                  divider={i > 0}
                />
              ))}
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Earnings" actionLabel="Details" onAction={() => goTab(DoctorTabNames.Earnings)} />
          <Card>
            <View style={styles.moneyRow}>
              {money.map((m, i) => (
                <View key={m.label} style={[styles.moneyCell, i > 0 && styles.moneyDivider]}>
                  <Text style={styles.moneyValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(m.amount, { code: APP_CURRENCY })}
                  </Text>
                  <Text style={styles.moneyLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </Card>
          <MiniWalletCard variant="light" onPress={() => navigation.navigate('WalletScreen')} style={styles.wallet} />
        </View>

        <Card style={styles.section}>
          <ListRow
            icon="chatbubbles-outline"
            title="Messages"
            subtitle="Conversations with your patients"
            badge={unread}
            onPress={() => navigation.navigate('ProviderConversations', { roomType: 'healthcare' })}
          />
        </Card>
      </>
    );
  };

  return (
    <Screen>
      <HomeHeader
        name={data?.doctorName || ''}
        onAccount={() => goTab(DoctorTabNames.Account)}
        onNotifications={() => navigation.navigate(DoctorRouteNames.DoctorNotifications)}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {content()}
        {/* Room for the toast above the tab bar. */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: GUTTER,
      paddingBottom: S.md,
      backgroundColor: c.accentDeep,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
    },
    headerText: { flex: 1, marginLeft: S.md },
    greeting: { ...T.caption, color: c.inkInverseSoft },
    name: { ...T.heading, color: c.inkInverse },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: R.pill,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    content: { paddingHorizontal: GUTTER, paddingTop: S.sm },
    section: { marginTop: SECTION },
    stats: { flexDirection: 'row', gap: S.sm },
    skeletonTile: { flex: 1 },
    staleBanner: { marginBottom: S.lg },
    staleRow: { flexDirection: 'row', alignItems: 'center' },
    staleText: { ...T.caption, color: c.inkMuted, flex: 1, marginHorizontal: S.sm },
    nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    nextWhen: { ...T.label, color: c.accentDeep },
    nextName: { ...T.heading, color: c.ink, marginTop: S.sm },
    nextMeta: { ...T.body, color: c.inkMuted, marginTop: 2 },
    nextSymptoms: { ...T.body, color: c.ink, marginTop: S.sm },
    nextButton: { marginTop: S.lg },
    listCard: { paddingHorizontal: S.lg },
    empty: { paddingVertical: S.xl },
    moneyRow: { flexDirection: 'row' },
    moneyCell: { flex: 1, alignItems: 'center', paddingHorizontal: S.xs },
    moneyDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line },
    moneyValue: { ...T.bodyStrong, color: c.ink },
    moneyLabel: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    wallet: { marginTop: S.md },
    bottomSpace: { height: S.huge * 2 },
  });

export default DoctorHomeScreen;
