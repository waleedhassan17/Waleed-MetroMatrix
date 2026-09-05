// ============================================================================
// Provider Settings.
//
// The gear in the profile header had no handler and there was no settings
// screen to send it to. This is that screen: the account-level switches that
// genuinely persist, plus the support and legal entry points.
//
// Dark mode and language are deliberately NOT here. Their Redux actions exist
// but nothing consumes them — there is no theme provider and no i18n layer —
// so they are shown as disabled "coming soon" rows on the profile screen
// rather than repeated here as if they worked.
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Shield,
  Bell,
  HelpCircle,
  FileText,
  Lock,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { RootState } from '../../../../store/store';
import { updateAvailability, toggleNotifications } from '../profile-screen/profileSlice';
import { performLogout } from '../../../../services/auth/logout';
import { contactSupport } from '../../../../utils/support/contactSupport';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { flatTheme as theme } from '../providerTheme';
import { C, F, GUTTER, R, S, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeFlatProviderTheme, type FlatProviderTheme } from '../providerTheme';
import { AppBar, Screen } from '../../../../components/ui';


const PRIVACY_URL = 'https://metromatrix.com/privacy';
const TERMS_URL = 'https://metromatrix.com/terms';

export default function ProviderSettingsScreen() {
  const { colors } = useTheme();
  const theme = useMemo(() => makeFlatProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { isAvailable, notificationsEnabled } = useAppSelector(
    (state: RootState) => state.profile
  );

  const openExternal = useCallback(async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(label, `Visit ${url}`);
    }
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await performLogout(dispatch);
          navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
        },
      },
    ]);
  }, [dispatch, navigation]);

  const links = [
    {
      id: 'support',
      title: 'Help & Support',
      subtitle: 'Reach our team 24/7',
      icon: HelpCircle,
      color: theme.primary,
      bg: theme.primaryLight,
      onPress: () => contactSupport('Provider settings'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'How we handle your data',
      icon: Lock,
      color: colors.info,
      bg: colors.infoSoft,
      onPress: () => openExternal(PRIVACY_URL, 'Privacy Policy'),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      subtitle: 'Your agreement with MetroMatrix',
      icon: FileText,
      color: colors.warning,
      bg: colors.warningSoft,
      onPress: () => openExternal(TERMS_URL, 'Terms of Service'),
    },
  ];

  return (
    <Screen>
      <AppBar title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>AVAILABILITY</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
              <Shield size={20} color={theme.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Available for Jobs</Text>
              <Text style={styles.rowSubtitle}>
                {isAvailable ? "You're visible to customers" : "You won't receive new jobs"}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={(next) => {
                dispatch(updateAvailability({ isOnline: next }));
              }}
              trackColor={{ false: colors.disabled, true: theme.primaryLight }}
              thumbColor={isAvailable ? theme.primary : colors.lineSoft}
              ios_backgroundColor={colors.disabled}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: colors.errorSoft }]}>
              <Bell size={20} color={theme.error} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowSubtitle}>Job alerts and messages</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={() => {
                dispatch(toggleNotifications());
              }}
              trackColor={{ false: colors.disabled, true: theme.primaryLight }}
              thumbColor={notificationsEnabled ? theme.primary : colors.lineSoft}
              ios_backgroundColor={colors.disabled}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>
        <View style={styles.card}>
          {links.map((link, index) => (
            <TouchableOpacity
              key={link.id}
              style={[styles.row, index < links.length - 1 && styles.rowBorder]}
              onPress={link.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: link.bg }]}>
                <link.icon size={20} color={link.color} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{link.title}</Text>
                <Text style={styles.rowSubtitle}>{link.subtitle}</Text>
              </View>
              <ChevronRight size={18} color={colors.inkFaint} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={20} color={theme.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: FlatProviderTheme) => StyleSheet.create({
  content: { padding: GUTTER, paddingBottom: 48 },
  sectionTitle: {
    ...T.label,
    fontFamily: F.bold,
    color: theme.textSecondary,
    letterSpacing: 0.6,
    marginBottom: S.sm + 2,
    marginTop: S.sm,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: R.card,
    marginBottom: GUTTER,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: S.lg, gap: S.md + 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  iconBox: { width: 40, height: 40, borderRadius: R.card, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { ...T.subhead, color: theme.text },
  rowSubtitle: { ...T.caption, color: theme.textSecondary, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: R.card,
    paddingVertical: S.lg,
  },
  logoutText: { ...T.subhead, color: theme.error },
});
