import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppBar,
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonCard,
  ToneBadge,
} from '../../../../components/ui';
import { GUTTER, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { ThemeColors, useTheme } from '../../../../theme';
import { consultationIcon, consultationLabel, formatDateLabel } from '../../../../utils/healthcare/doctorFormat';
import { dateKeyOf } from '../../../../utils/healthcare/timeRanges';
import { fetchPatientHistory, resetPatientHistory } from './patientHistorySlice';

// ============================================================================
// A patient's visits with this doctor.
//
// Visit cards showed a chevron and did nothing but highlight when tapped, and
// "0 yrs · Male" appeared for patients whose age and gender were never
// recorded. Each visit now opens its appointment, and unknown details are left
// out rather than invented.
// ============================================================================

const genderWord = (g: string) => (g === 'male' ? 'Male' : g === 'female' ? 'Female' : g === 'other' ? 'Other' : '');

const PatientHistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const patientId: string = route.params?.patientId;
  const fallbackName: string | undefined = route.params?.patientName;

  const { patient, loading, error } = useAppSelector((s) => s.patientHistory);

  const load = useCallback(() => {
    if (patientId) dispatch(fetchPatientHistory(patientId));
  }, [dispatch, patientId]);

  useEffect(() => {
    load();
    return () => {
      dispatch(resetPatientHistory());
    };
  }, [dispatch, load]);

  const shown = patient && patient.patientId === patientId ? patient : null;
  const name = shown?.patientName || fallbackName || 'Patient';
  const latestVisit = shown?.visits[0];

  const body = () => {
    if (!shown) {
      if (error && !loading) return <ErrorState message={error} onRetry={load} />;
      return <SkeletonCard lines={3} />;
    }
    const details = [shown.age > 0 ? `${shown.age} yrs` : '', genderWord(shown.gender), shown.bloodGroup].filter(Boolean).join(' · ');

    return (
      <>
        <Card elevation="raised">
          <View style={styles.identity}>
            <Avatar name={name} size={52} />
            <View style={styles.identityText}>
              <Text style={styles.name}>{name}</Text>
              {!!details && <Text style={styles.muted}>{details}</Text>}
              <Text style={styles.muted}>
                {shown.visits.length} visit{shown.visits.length === 1 ? '' : 's'} with you
              </Text>
            </View>
          </View>
          {(shown.allergies.length > 0 || shown.chronicConditions.length > 0) && (
            <View style={styles.flags}>
              {shown.allergies.map((a) => (
                <ToneBadge key={`a-${a}`} label={`Allergy: ${a}`} tone="error" style={styles.flag} />
              ))}
              {shown.chronicConditions.map((cc) => (
                <ToneBadge key={`c-${cc}`} label={cc} tone="warning" style={styles.flag} />
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          {!!latestVisit && (
            <ListRow
              icon="chatbubble-ellipses-outline"
              title="Message"
              onPress={() => navigation.navigate('DoctorConsultChat', { appointmentId: latestVisit.visitId, patientName: name })}
            />
          )}
          {!!shown.phone && (
            <ListRow
              icon="call-outline"
              title="Call"
              subtitle={shown.phone}
              onPress={() => Linking.openURL(`tel:${shown.phone}`)}
              divider={!!latestVisit}
            />
          )}
          <ListRow
            icon="clipboard-outline"
            title="Consultation notes"
            onPress={() =>
              navigation.navigate(DoctorRouteNames.ConsultationNotes, {
                appointmentId: latestVisit?.visitId ?? '',
                patientId,
                patientName: name,
              })
            }
            divider={!!latestVisit || !!shown.phone}
          />
        </Card>

        <SectionHeader title="Visits" style={styles.section} />
        {shown.visits.length === 0 ? (
          <Card>
            <EmptyState icon="time-outline" title="No visits yet" message="Visits with you appear here." />
          </Card>
        ) : (
          <Card padded={false} style={styles.listCard}>
            {shown.visits.map((visit, i) => (
              <TouchableOpacity
                key={visit.visitId}
                style={[styles.visit, i > 0 && styles.divider]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(DoctorRouteNames.AppointmentDetail, { appointmentId: visit.visitId })}
                accessibilityRole="button"
                accessibilityLabel={`Visit on ${visit.date ? formatDateLabel(dateKeyOf(new Date(visit.date))) : 'unknown date'}`}
              >
                <View style={styles.visitIcon}>
                  <Ionicons name={consultationIcon(visit.type) as any} size={18} color={colors.inkMuted} />
                </View>
                <View style={styles.visitBody}>
                  <Text style={styles.strong}>
                    {visit.date ? formatDateLabel(dateKeyOf(new Date(visit.date)), { weekday: false, year: true }) : 'Date unknown'}
                  </Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {visit.diagnosis || `${consultationLabel(visit.type)} consultation`}
                  </Text>
                  <View style={styles.visitBadges}>
                    {!!visit.prescriptionId && <ToneBadge label="Prescription" tone="accent" icon="medkit-outline" style={styles.flag} />}
                    {!!visit.followUp && (
                      <ToneBadge
                        label={`Follow-up ${formatDateLabel(dateKeyOf(new Date(visit.followUp)), { weekday: false })}`}
                        tone="info"
                        style={styles.flag}
                      />
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </>
    );
  };

  return (
    <Screen>
      <AppBar title="Patient" subtitle={name} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading && !!shown} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {body()}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    section: { marginTop: SECTION },
    identity: { flexDirection: 'row', alignItems: 'center' },
    identityText: { flex: 1, marginLeft: S.md },
    name: { ...T.heading, color: c.ink },
    muted: { ...T.body, color: c.inkMuted, marginTop: 2 },
    strong: { ...T.bodyStrong, color: c.ink },
    flags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.md },
    flag: { marginRight: S.xs, marginTop: S.xs },
    listCard: { paddingHorizontal: S.lg },
    visit: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    visitIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
    visitBody: { flex: 1, marginHorizontal: S.md },
    visitBadges: { flexDirection: 'row', flexWrap: 'wrap' },
    bottomSpace: { height: S.huge },
  });

export default PatientHistoryScreen;
