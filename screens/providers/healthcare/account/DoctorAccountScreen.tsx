import { useNavigation, useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import DarkModeSwitch from '../../../../components/ui/DarkModeSwitch';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonCard,
  ToneBadge,
  showToast,
} from '../../../../components/ui';
import { GUTTER, S, SECTION, T } from '../../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { useStaleWhileFocus } from '../../../../hooks/useStaleWhileFocus';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import { selectTotalUnread } from '../../../../store/unreadSlice';
import { ThemeColors, useTheme } from '../../../../theme';
import { contactSupport } from '../../../../utils/support/contactSupport';
import { fetchDoctorProfile, type DoctorProfileData } from '../profile/doctorProfileSlice';
import { useDoctorSignOut } from '../useDoctorSignOut';

// ============================================================================
// Account: who you are to patients, the parts of your practice you set up
// once, and the app itself.
//
// There was no settings screen for a doctor. Profile, availability, reviews
// and notifications were tiles on the dashboard; dark mode and sign-out sat at
// the bottom of a long animated profile; the only other way to sign out was a
// system dialog. One list, in the order a doctor looks for things.
// ============================================================================

const PRIVACY_URL = 'https://metromatrix.com/privacy';
const TERMS_URL = 'https://metromatrix.com/terms';

/** Share of the profile a patient sees that is actually filled in. */
export function profileCompleteness(p: DoctorProfileData | null): number {
  if (!p) return 0;
  const checks = [
    !!p.bio?.trim(),
    !!p.qualification?.trim(),
    p.experience > 0,
    p.consultationFee > 0,
    p.videoConsultationFee > 0,
    !!p.clinicName?.trim(),
    !!p.phone?.trim(),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const DoctorAccountScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { profile, loading, error, lastFetchedAt } = useAppSelector((s) => s.doctorProfile);
  const unread = useAppSelector(selectTotalUnread);
  const { requestSignOut, sheet } = useDoctorSignOut();

  const load = useCallback(() => {
    dispatch(fetchDoctorProfile());
  }, [dispatch]);
  useStaleWhileFocus(load, lastFetchedAt, 60000);

  const openExternal = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showToast({ message: `Visit ${url}`, tone: 'neutral' });
    }
  };

  const completeness = profileCompleteness(profile);

  return (
    <Screen>
      <AppBar title="Account" hideBack />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && !!profile} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {!profile ? (
          loading || !error ? (
            <SkeletonCard lines={2} />
          ) : (
            <Card>
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" size="sm" fullWidth={false} onPress={load} style={styles.retry} />
            </Card>
          )
        ) : (
          <Card elevation="raised" onPress={() => navigation.navigate(DoctorRouteNames.EditDoctorProfile)}>
            <View style={styles.identity}>
              <Avatar name={profile.fullName} size={56} tint={colors.accentSoft} color={colors.accentDeep} />
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.fullName || 'Your name'}
                </Text>
                {!!profile.specialization && (
                  <Text style={styles.meta} numberOfLines={1}>
                    {profile.specialization}
                  </Text>
                )}
                <ToneBadge
                  style={styles.verified}
                  label={profile.isVerified ? 'Verified' : 'Verification pending'}
                  icon={profile.isVerified ? 'shield-checkmark-outline' : 'time-outline'}
                  tone={profile.isVerified ? 'success' : 'warning'}
                />
              </View>
            </View>
            {completeness < 100 && (
              <View style={styles.completeness}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${completeness}%` }]} />
                </View>
                <Text style={styles.completenessText}>
                  Profile {completeness}% complete — add your details so patients know what to expect.
                </Text>
              </View>
            )}
          </Card>
        )}

        <SectionHeader title="Practice" style={styles.section} />
        <Card>
          <ListRow
            icon="calendar-outline"
            tone="accent"
            title="Availability"
            subtitle="Weekly hours, calendar and time off"
            onPress={() => navigation.navigate(DoctorRouteNames.AvailabilityHub)}
          />
          <ListRow
            icon="star-outline"
            title="Reviews"
            value={profile?.totalReviews ? `${(profile.rating || 0).toFixed(1)} · ${profile.totalReviews}` : undefined}
            onPress={() => navigation.navigate(DoctorRouteNames.DoctorMyReviews)}
            divider
          />
          <ListRow
            icon="person-outline"
            title="Edit profile"
            subtitle="Bio, qualifications and fees"
            onPress={() => navigation.navigate(DoctorRouteNames.EditDoctorProfile)}
            divider
          />
        </Card>

        <SectionHeader title="Messages and money" style={styles.section} />
        <Card>
          <ListRow
            icon="chatbubbles-outline"
            title="Messages"
            badge={unread}
            onPress={() => navigation.navigate('ProviderConversations', { roomType: 'healthcare' })}
          />
          <ListRow
            icon="notifications-outline"
            title="Notifications"
            onPress={() => navigation.navigate(DoctorRouteNames.DoctorNotifications)}
            divider
          />
          <ListRow
            icon="wallet-outline"
            title="Wallet and payouts"
            onPress={() => navigation.navigate('WalletScreen')}
            divider
          />
        </Card>

        <SectionHeader title="Preferences" style={styles.section} />
        <Card>
          <DarkModeSwitch />
        </Card>

        <SectionHeader title="Help" style={styles.section} />
        <Card>
          <ListRow
            icon="help-circle-outline"
            title="Help and support"
            subtitle="Reach the MetroMatrix team"
            onPress={() => contactSupport('Doctor account')}
          />
          <ListRow icon="lock-closed-outline" title="Privacy policy" onPress={() => openExternal(PRIVACY_URL)} divider />
          <ListRow icon="document-text-outline" title="Terms of service" onPress={() => openExternal(TERMS_URL)} divider />
        </Card>

        <Card style={styles.section}>
          <ListRow icon="log-out-outline" tone="error" title="Sign out" onPress={requestSignOut} />
        </Card>

        <View style={styles.bottomSpace} />
      </ScrollView>
      {sheet}
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
    meta: { ...T.body, color: c.inkMuted, marginTop: 2 },
    verified: { marginTop: S.sm },
    completeness: { marginTop: S.lg },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceSunken, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
    completenessText: { ...T.caption, color: c.inkMuted, marginTop: S.sm },
    errorText: { ...T.body, color: c.inkMuted },
    retry: { marginTop: S.md },
    bottomSpace: { height: S.huge * 2 },
  });

export default DoctorAccountScreen;
