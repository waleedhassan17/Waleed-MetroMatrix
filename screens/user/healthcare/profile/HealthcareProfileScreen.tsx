import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../../../store/hooks';

// ── Theme ───────────────────────────────────
const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  surface: '#FFFFFF',
  bg: '#F7F9FC',
  textPrimary: '#1A1A1A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// ── Section Items ────────────────────────────
const QUICK_ACTIONS = [
  { id: 'appointments', label: 'My Appointments', icon: 'calendar-outline', color: THEME.primary, bg: THEME.primaryLight, route: 'MyAppointments' },
  { id: 'records', label: 'Health Records', icon: 'document-text-outline', color: '#10B981', bg: '#ECFDF5', route: 'HealthRecords' },
  { id: 'prescriptions', label: 'Prescriptions', icon: 'medkit-outline', color: '#7C3AED', bg: '#F5F3FF', route: 'HealthRecords' },
];

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { id: 'edit', label: 'Edit Profile', icon: 'create-outline', iconColor: THEME.primary },
      { id: 'password', label: 'Change Password', icon: 'lock-closed-outline', iconColor: THEME.textSecondary },
      { id: 'emergency_contacts', label: 'Emergency Contacts', icon: 'people-outline', iconColor: '#F59E0B' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'language', label: 'Language', icon: 'globe-outline', iconColor: THEME.textSecondary, value: 'English' },
      { id: 'currency', label: 'Currency', icon: 'cash-outline', iconColor: '#10B981', value: 'PKR' },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: 'help', label: 'Help & Support', icon: 'help-circle-outline', iconColor: THEME.primary },
      { id: 'privacy', label: 'Privacy Policy', icon: 'shield-outline', iconColor: THEME.textSecondary },
      { id: 'terms', label: 'Terms of Service', icon: 'document-outline', iconColor: THEME.textSecondary },
    ],
  },
];

// ── Main Screen ─────────────────────────────
const HealthcareProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector((s) => s.signIn.user);

  // Real identity from auth; medical details default to "not set" rather than
  // fabricated values (showing a fake blood group/allergy in a health app is unsafe).
  const profile = {
    name: user?.fullName?.trim() || 'Your Profile',
    email: user?.email || '—',
    phone: user?.phoneNumber || 'Add phone number',
    bloodGroup: '—',
    age: null as number | null,
    weight: '—',
    height: '—',
    allergies: [] as string[],
    conditions: [] as string[],
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from the Healthcare portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => navigation.navigate('RoleSelection'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* Header */}
      <LinearGradient
        colors={['#2A7FFF', '#1857C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editHeaderButton}
          onPress={() => Alert.alert('Edit Profile', 'Edit profile screen coming soon.')}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <Animated.ScrollView
        style={[{ flex: 1, opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <LinearGradient
            colors={['#2A7FFF', '#1857C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                style={styles.avatarBg}
              >
                <Ionicons name="person" size={44} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark-circle" size={22} color={THEME.success} />
              </View>
            </View>

            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            <Text style={styles.profilePhone}>{profile.phone}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Medical Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <View style={styles.medInfoGrid}>
            {[
              { label: 'Blood Group', value: profile.bloodGroup, icon: 'water', color: '#EF4444' },
              { label: 'Age', value: profile.age ? `${profile.age} years` : '—', icon: 'person', color: THEME.primary },
              { label: 'Weight', value: profile.weight, icon: 'barbell-outline', color: '#10B981' },
              { label: 'Height', value: profile.height, icon: 'resize', color: '#7C3AED' },
            ].map((item) => (
              <View key={item.label} style={styles.medInfoItem}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
                <Text style={styles.medInfoValue}>{item.value}</Text>
                <Text style={styles.medInfoLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>Allergies</Text>
            <View style={styles.tagRow}>
              {profile.allergies.length > 0 ? (
                profile.allergies.map((a) => (
                  <View key={a} style={[styles.tag, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.tagText, { color: '#EF4444' }]}>{a}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyHint}>None recorded</Text>
              )}
            </View>
          </View>

          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>Chronic Conditions</Text>
            <View style={styles.tagRow}>
              {profile.conditions.length > 0 ? (
                profile.conditions.map((c) => (
                  <View key={c} style={[styles.tag, { backgroundColor: THEME.primaryLight }]}>
                    <Text style={[styles.tagText, { color: THEME.primary }]}>{c}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyHint}>None recorded</Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={() => navigation.navigate(action.route as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notification Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          {[
            {
              label: 'Push Notifications',
              desc: 'Receive all healthcare updates',
              value: notificationsEnabled,
              onChange: setNotificationsEnabled,
            },
            {
              label: 'Appointment Reminders',
              desc: '24h and 1h before your appointments',
              value: reminderEnabled,
              onChange: setReminderEnabled,
            },
          ].map((item) => (
            <View key={item.label} style={styles.prefRow}>
              <View style={styles.prefTextGroup}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: THEME.border, true: `${THEME.primary}50` }}
                thumbColor={item.value ? THEME.primary : '#CBD5E1'}
              />
            </View>
          ))}
        </View>

        {/* Settings Sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.settingsRow,
                  idx < section.items.length - 1 && styles.settingsRowBorder,
                ]}
                onPress={() => Alert.alert(item.label, `${item.label} screen coming soon.`)}
                activeOpacity={0.7}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: `${item.iconColor}18` }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                </View>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                {'value' in item && (
                  <Text style={styles.settingsValue}>{(item as any).value}</Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={THEME.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={THEME.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  editHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16 },

  // Profile Card
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  profileName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  profilePhone: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 12,
    gap: 0,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Section Card
  sectionCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 14,
  },

  // Medical Info
  medInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  medInfoItem: {
    width: '46%',
    backgroundColor: THEME.bg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  medInfoValue: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  medInfoLabel: { fontSize: 11, color: THEME.textSecondary },
  tagSection: { marginTop: 8 },
  tagSectionLabel: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: THEME.textTertiary, fontStyle: 'italic' },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  quickActionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
    textAlign: 'center',
  },

  // Preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  prefTextGroup: { flex: 1 },
  prefLabel: { fontSize: 14, fontWeight: '600', color: THEME.textPrimary },
  prefDesc: { fontSize: 12, color: THEME.textSecondary, marginTop: 1 },

  // Settings Rows
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  settingsIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: THEME.textPrimary },
  settingsValue: { fontSize: 13, color: THEME.textSecondary, marginRight: 4 },

  // Member Chip
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  memberText: { fontSize: 13, color: THEME.textSecondary },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: THEME.error },
});

export default HealthcareProfileScreen;
