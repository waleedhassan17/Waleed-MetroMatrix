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

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
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


const PRIVACY_URL = 'https://metromatrix.com/privacy';
const TERMS_URL = 'https://metromatrix.com/terms';

export default function ProviderSettingsScreen() {
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
      color: '#6366F1',
      bg: '#E0E7FF',
      onPress: () => openExternal(PRIVACY_URL, 'Privacy Policy'),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      subtitle: 'Your agreement with MetroMatrix',
      icon: FileText,
      color: '#F59E0B',
      bg: '#FEF3C7',
      onPress: () => openExternal(TERMS_URL, 'Terms of Service'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

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
              trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
              thumbColor={isAvailable ? theme.primary : '#F3F4F6'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
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
              trackColor={{ false: '#E5E7EB', true: theme.primaryLight }}
              thumbColor={notificationsEnabled ? theme.primary : '#F3F4F6'}
              ios_backgroundColor="#E5E7EB"
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
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={20} color={theme.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  content: { padding: 20, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  rowSubtitle: { fontSize: 12.5, color: theme.textSecondary, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingVertical: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: theme.error },
});
