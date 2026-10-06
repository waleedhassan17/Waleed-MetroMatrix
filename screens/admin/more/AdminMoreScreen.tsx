// ============================================================================
// More tab — the signed-in admin, their account, notifications, admins,
// platform settings, wallets and payouts, appearance, and sign-out.
//
// Each door is shown to the admins who can use what is behind it, and every
// one a permission allows is reachable from here: an admin with only finance
// or only analytics has no module to reach them through.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AdminScreen, ConfirmSheet, Section } from '../../../components/admin';
import { Avatar, ListRow, ToneBadge } from '../../../components/ui';
import DarkModeSwitch from '../../../components/ui/DarkModeSwitch';
import { useAdminProfile, usePermission } from '../../../hooks/useAdminPermission';
import { useAdminSignOut } from '../../../hooks/useAdminSignOut';
import { useAdminMeta } from '../../../hooks/useAdminMeta';
import { useGetUnreadCountQuery } from '../../../networks/admin/adminApi';
import { S, T, useTheme, type ThemeColors } from '../../../theme';

export default function AdminMoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const admin = useAdminProfile();
  const { data: meta } = useAdminMeta();
  const { data: unread } = useGetUnreadCountQuery();
  const canManageAdmins = usePermission('canManageAdmins');
  const canManageFinance = usePermission('canManageFinance');
  const canViewAnalytics = usePermission('canViewAnalytics');
  const signOut = useAdminSignOut();
  const [confirm, setConfirm] = useState<null | 'here' | 'everywhere'>(null);
  const [busy, setBusy] = useState(false);

  const roleLabel = meta?.roles.find((r: { value?: string }) => r.value === admin?.role) as { label?: string } | undefined;

  const doSignOut = async () => {
    setBusy(true);
    await signOut({ everywhere: confirm === 'everywhere' });
    setBusy(false);
  };

  return (
    <AdminScreen title="More" hideBack>
      <View style={styles.who} accessible accessibilityLabel={`${admin?.fullName}, ${admin?.email}`}>
        <Avatar name={admin?.fullName} uri={admin?.avatar} size={56} />
        <View style={styles.whoText}>
          <Text style={styles.name} numberOfLines={1}>
            {admin?.fullName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {admin?.email}
          </Text>
          <ToneBadge label={roleLabel?.label || admin?.role || ''} tone="accent" style={styles.role} />
        </View>
      </View>

      <Section title="Console" card>
        <ListRow
          title="Notifications"
          icon="notifications-outline"
          badge={unread || undefined}
          onPress={() => navigation.navigate('AdminNotifications')}
          divider
        />
        <ListRow
          title="Platform settings"
          icon="options-outline"
          onPress={() => navigation.navigate('AdminSettings')}
          divider={canManageAdmins || canViewAnalytics}
        />
        {canViewAnalytics && (
          <ListRow
            title="Platform analytics"
            subtitle="Live usage, demand, leaderboards and ML models"
            icon="pulse-outline"
            onPress={() => navigation.navigate('PlatformAnalytics')}
            divider={canManageAdmins}
          />
        )}
        {canManageAdmins && <ListRow title="Admins" subtitle="Accounts, roles and sessions" icon="shield-checkmark-outline" onPress={() => navigation.navigate('AdminManagement')} />}
      </Section>

      {canManageFinance && (
        <Section title="Wallets and payouts" card>
          <ListRow
            title="Payout requests"
            subtitle="Provider withdrawals to approve"
            icon="cash-outline"
            onPress={() => navigation.navigate('AdminHSPayouts')}
          />
        </Section>
      )}

      <Section title="Your account" card>
        <ListRow
          title="Profile and security"
          subtitle="Name, password, two-factor sign-in, signed-in devices"
          icon="person-circle-outline"
          onPress={() => navigation.navigate('AdminProfile')}
        />
      </Section>

      <Section title="This device" card>
        <DarkModeSwitch />
      </Section>

      <Section title="Sign out" card>
        <ListRow title="Sign out" icon="log-out-outline" onPress={() => setConfirm('here')} divider />
        <ListRow title="Sign out of all devices" icon="phone-portrait-outline" tone="error" onPress={() => setConfirm('everywhere')} />
      </Section>

      <ConfirmSheet
        visible={!!confirm}
        title={confirm === 'everywhere' ? 'Sign out of all devices?' : 'Sign out?'}
        message={
          confirm === 'everywhere'
            ? 'Every device signed in to your admin account, including this one, will need to sign in again.'
            : 'You will need your password (and code, if two-factor is on) to sign back in.'
        }
        confirmLabel={confirm === 'everywhere' ? 'Sign out everywhere' : 'Sign out'}
        destructive={confirm === 'everywhere'}
        busy={busy}
        onConfirm={doSignOut}
        onClose={() => setConfirm(null)}
      />
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    who: { flexDirection: 'row', alignItems: 'center', gap: S.lg, marginBottom: S.xxl },
    whoText: { flex: 1, minWidth: 0 },
    name: { ...T.heading, color: c.ink },
    email: { ...T.body, color: c.inkMuted, marginTop: 2 },
    role: { alignSelf: 'flex-start', marginTop: S.sm },
  });
