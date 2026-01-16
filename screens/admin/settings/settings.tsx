import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  getSettingsAsync,
  updateGeneralSettingsAsync,
  updateNotificationSettingsAsync,
  updateSecuritySettingsAsync,
  selectSettings,
  selectIsSaving,
  selectHasUnsavedChanges,
  updateLocalGeneralSettings,
  updateLocalNotificationSettings,
  updateLocalSecuritySettings,
  updateLocalAppearanceSettings,
  setActiveSection,
} from './settingsSlice';

type IconName = keyof typeof Ionicons.glyphMap;
type SettingsSection = 'general' | 'notifications' | 'security' | 'appearance';

const SectionHeader = ({ icon, title, subtitle }: { icon: IconName; title: string; subtitle: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconContainer}>
      <Ionicons name={icon} size={22} color="#6366f1" />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const SettingRow = ({
  icon,
  label,
  description,
  children,
}: {
  icon: IconName;
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingRowLeft}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color="#6366f1" />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
    </View>
    <View style={styles.settingRowRight}>{children}</View>
  </View>
);

const SettingsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const settings = useAppSelector(selectSettings);
  const isSaving = useAppSelector(selectIsSaving);
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedChanges);

  const [activeTab, setActiveTab] = useState<SettingsSection>('general');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(getSettingsAsync());
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const handleSaveGeneral = async () => {
    try {
      await dispatch(updateGeneralSettingsAsync(settings.general)).unwrap();
      Alert.alert('Success', 'General settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to save settings');
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await dispatch(updateNotificationSettingsAsync(settings.notifications)).unwrap();
      Alert.alert('Success', 'Notification settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to save settings');
    }
  };

  const handleSaveSecurity = async () => {
    try {
      await dispatch(updateSecuritySettingsAsync(settings.security)).unwrap();
      Alert.alert('Success', 'Security settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to save settings');
    }
  };

  const tabs: { key: SettingsSection; label: string; icon: IconName }[] = [
    { key: 'general', label: 'General', icon: 'settings-outline' },
    { key: 'notifications', label: 'Alerts', icon: 'notifications-outline' },
    { key: 'security', label: 'Security', icon: 'shield-outline' },
    { key: 'appearance', label: 'Theme', icon: 'color-palette-outline' },
  ];

  const renderGeneralSettings = () => (
    <View style={styles.settingsSection}>
      <SectionHeader
        icon="business"
        title="Platform Settings"
        subtitle="Configure your platform basics"
      />
      <View style={styles.settingsCard}>
        <SettingRow icon="text-outline" label="Platform Name" description="Your platform's display name">
          <TextInput
            style={styles.textInput}
            value={settings.general.platformName}
            onChangeText={(text) => {
              dispatch(updateLocalGeneralSettings({ platformName: text }));
            }}
            placeholder="MetroMatrix"
          />
        </SettingRow>
        <SettingRow icon="mail-outline" label="Contact Email">
          <TextInput
            style={styles.textInput}
            value={settings.general.contactEmail || ''}
            onChangeText={(text) => {
              dispatch(updateLocalGeneralSettings({ contactEmail: text }));
            }}
            placeholder="admin@example.com"
            keyboardType="email-address"
          />
        </SettingRow>
        <SettingRow icon="call-outline" label="Support Phone">
          <TextInput
            style={styles.textInput}
            value={settings.general.supportPhone || ''}
            onChangeText={(text) => {
              dispatch(updateLocalGeneralSettings({ supportPhone: text }));
            }}
            placeholder="+92 300 1234567"
            keyboardType="phone-pad"
          />
        </SettingRow>
      </View>

      <SectionHeader
        icon="cog"
        title="Automation"
        subtitle="Configure automatic behaviors"
      />
      <View style={styles.settingsCard}>
        <SettingRow icon="checkmark-circle-outline" label="Auto-Approve Providers" description="Automatically approve new registrations">
          <Switch
            value={settings.general.autoApproveProviders || false}
            onValueChange={(value) => {
              dispatch(updateLocalGeneralSettings({ autoApproveProviders: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="mail-unread-outline" label="Require Email Verification">
          <Switch
            value={settings.general.requireEmailVerification !== false}
            onValueChange={(value) => {
              dispatch(updateLocalGeneralSettings({ requireEmailVerification: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="construct-outline" label="Maintenance Mode" description="Temporarily disable platform access">
          <Switch
            value={settings.general.maintenanceMode || false}
            onValueChange={(value) => {
              dispatch(updateLocalGeneralSettings({ maintenanceMode: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#ef4444' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveGeneral} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save General Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderNotificationSettings = () => (
    <View style={styles.settingsSection}>
      <SectionHeader
        icon="notifications"
        title="Notification Preferences"
        subtitle="Manage how you receive alerts"
      />
      <View style={styles.settingsCard}>
        <SettingRow icon="mail-outline" label="Email Notifications" description="Receive alerts via email">
          <Switch
            value={settings.notifications.emailNotifications !== false}
            onValueChange={(value) => {
              dispatch(updateLocalNotificationSettings({ emailNotifications: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="phone-portrait-outline" label="Push Notifications">
          <Switch
            value={settings.notifications.pushNotifications !== false}
            onValueChange={(value) => {
              dispatch(updateLocalNotificationSettings({ pushNotifications: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
      </View>

      <SectionHeader
        icon="list"
        title="Alert Types"
        subtitle="Choose which events trigger notifications"
      />
      <View style={styles.settingsCard}>
        <SettingRow icon="person-add-outline" label="Provider Registrations">
          <Switch
            value={settings.notifications.providerRegistrations !== false}
            onValueChange={(value) => {
              dispatch(updateLocalNotificationSettings({ providerRegistrations: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="people-outline" label="User Registrations">
          <Switch
            value={settings.notifications.userRegistrations !== false}
            onValueChange={(value) => {
              dispatch(updateLocalNotificationSettings({ userRegistrations: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="warning-outline" label="System Alerts">
          <Switch
            value={settings.notifications.systemAlerts !== false}
            onValueChange={(value) => {
              dispatch(updateLocalNotificationSettings({ systemAlerts: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="document-text-outline" label="Weekly Reports">
          <Switch
            value={settings.notifications.weeklyReports || false}
            onValueChange={(value) => {
              dispatch(updateLocalNotificationSettings({ weeklyReports: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveNotifications} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Notification Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSecuritySettings = () => (
    <View style={styles.settingsSection}>
      <SectionHeader
        icon="shield-checkmark"
        title="Security Settings"
        subtitle="Protect your admin account"
      />
      <View style={styles.settingsCard}>
        <SettingRow icon="key-outline" label="Two-Factor Auth" description="Add extra login security">
          <Switch
            value={settings.security.twoFactorEnabled || false}
            onValueChange={(value) => {
              dispatch(updateLocalSecuritySettings({ twoFactorEnabled: value }));
            }}
            trackColor={{ false: '#e2e8f0', true: '#10b981' }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
        <SettingRow icon="time-outline" label="Session Timeout (min)">
          <TextInput
            style={[styles.textInput, { width: 80, textAlign: 'center' }]}
            value={String(settings.security.sessionTimeout || 30)}
            onChangeText={(text) => {
              dispatch(updateLocalSecuritySettings({ sessionTimeout: parseInt(text) || 30 }));
            }}
            keyboardType="numeric"
          />
        </SettingRow>
        <SettingRow icon="alert-circle-outline" label="Max Login Attempts">
          <TextInput
            style={[styles.textInput, { width: 80, textAlign: 'center' }]}
            value={String(settings.security.maxLoginAttempts || 5)}
            onChangeText={(text) => {
              dispatch(updateLocalSecuritySettings({ maxLoginAttempts: parseInt(text) || 5 }));
            }}
            keyboardType="numeric"
          />
        </SettingRow>
        <SettingRow icon="calendar-outline" label="Password Expiry (days)">
          <TextInput
            style={[styles.textInput, { width: 80, textAlign: 'center' }]}
            value={String(settings.security.passwordExpiry || 90)}
            onChangeText={(text) => {
              dispatch(updateLocalSecuritySettings({ passwordExpiry: parseInt(text) || 90 }));
            }}
            keyboardType="numeric"
          />
        </SettingRow>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveSecurity} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Security Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAppearanceSettings = () => {
    const themes = [
      { key: 'light', label: 'Light', icon: 'sunny-outline' as IconName, color: '#f8fafc' },
      { key: 'dark', label: 'Dark', icon: 'moon-outline' as IconName, color: '#1e293b' },
      { key: 'system', label: 'System', icon: 'phone-portrait-outline' as IconName, color: '#6366f1' },
    ];

    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
      <View style={styles.settingsSection}>
        <SectionHeader
          icon="color-palette"
          title="Theme"
          subtitle="Choose your preferred look"
        />
        <View style={styles.themeGrid}>
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={[
                styles.themeCard,
                settings.appearance?.theme === theme.key && styles.themeCardActive,
              ]}
              onPress={() => {
                dispatch(updateLocalAppearanceSettings({ theme: theme.key as 'light' | 'dark' | 'system' }));
              }}
            >
              <View style={[styles.themePreview, { backgroundColor: theme.color }]}>
                <Ionicons name={theme.icon} size={24} color={theme.key === 'light' ? '#1e293b' : '#FFFFFF'} />
              </View>
              <Text style={styles.themeLabel}>{theme.label}</Text>
              {settings.appearance?.theme === theme.key && (
                <View style={styles.themeCheck}>
                  <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader
          icon="color-fill"
          title="Accent Color"
          subtitle="Personalize your dashboard"
        />
        <View style={styles.colorGrid}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                settings.appearance?.primaryColor === color && styles.colorOptionActive,
              ]}
              onPress={() => {
                dispatch(updateLocalAppearanceSettings({ primaryColor: color }));
              }}
            >
              {settings.appearance?.primaryColor === color && (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? '#6366f1' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'notifications' && renderNotificationSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
        {activeTab === 'appearance' && renderAppearanceSettings()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  content: {
    flex: 1,
  },
  settingsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  settingDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  settingRowRight: {
    alignItems: 'flex-end',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 140,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  themeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  themeCardActive: {
    borderColor: '#6366f1',
  },
  themePreview: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
});

export default SettingsScreen;