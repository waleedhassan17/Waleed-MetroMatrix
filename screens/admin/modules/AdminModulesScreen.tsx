// ============================================================================
// Modules tab — the three verticals, each shown only to admins who manage it.
// Each module is a card: its icon, what it covers, and one live figure that
// needs attention (open disputes, doctors awaiting verification, brands
// awaiting approval — the same counts as the Overview queues). Full names
// throughout ("Home services", not "HS").
// ============================================================================

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AdminScreen, Section } from '../../../components/admin';
import { Card, EmptyState, ListRow, ToneBadge } from '../../../components/ui';
import { usePermission } from '../../../hooks/useAdminPermission';
import { useGetOverviewQuery } from '../../../networks/admin/adminApi';
import { formatCount } from '../../../utils/admin/format';
import { R, S, T, useTheme, type ThemeColors } from '../../../theme';

type Row = { title: string; subtitle: string; icon: string; route: string; show: boolean };

type HeadProps = {
  icon: string;
  title: string;
  subtitle: string;
  /** The live figure; null hides the badge (not measured, or nothing to count). */
  count: number | null;
  countLabel: string;
  onPress?: () => void;
};

function ModuleHead({ icon, title, subtitle, count, countLabel, onPress }: HeadProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const body = (
    <>
      <View style={styles.well}>
        <Ionicons name={icon as any} size={24} color={colors.accent} />
      </View>
      <View style={styles.headText}>
        <Text style={styles.headTitle}>{title}</Text>
        <Text style={styles.headSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {count !== null && <ToneBadge label={count ? `${formatCount(count)} ${countLabel}` : 'All clear'} tone={count ? 'warning' : 'success'} />}
      {!!onPress && <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />}
    </>
  );
  const a11y = `${title}. ${subtitle}.${count === null ? '' : count ? ` ${count} ${countLabel}.` : ' All clear.'}`;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.head, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={a11y}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.head} accessible accessibilityLabel={a11y}>
      {body}
    </View>
  );
}

export default function AdminModulesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const homeServices = usePermission('canManageHomeServices');
  const finance = usePermission('canManageFinance');
  const healthcare = usePermission('canManageHealthcare');
  const shopping = usePermission('canManageShopping');
  const analytics = usePermission('canViewAnalytics');
  // The same request as Overview (cached): the live count on each card.
  const overview = useGetOverviewQuery(undefined);
  const waiting = (type: string): number | null => {
    const q = overview.data?.queues?.find((x) => x.type === type);
    return q && typeof q.count === 'number' ? q.count : null;
  };

  const homeServiceRows: Row[] = [
    { title: 'Bookings', subtitle: 'Status, refunds and payment trail', icon: 'calendar-outline', route: 'AdminHSBookings', show: true },
    { title: 'Disputes', subtitle: 'Customer and provider disputes', icon: 'chatbox-ellipses-outline', route: 'AdminHSDisputes', show: true },
    { title: 'Payout requests', subtitle: 'Provider withdrawals to approve', icon: 'cash-outline', route: 'AdminHSPayouts', show: finance },
    { title: 'Service categories', subtitle: 'What customers can book', icon: 'grid-outline', route: 'AdminHSServiceCategories', show: true },
    { title: 'Analytics', subtitle: 'Bookings, value and the busiest providers', icon: 'bar-chart-outline', route: 'AdminHSAnalytics', show: true },
    { title: 'Settings', subtitle: 'Payouts, search radius and matching', icon: 'settings-outline', route: 'AdminHSSettings', show: true },
  ].filter((r) => r.show);

  return (
    <AdminScreen title="Modules" hideBack refreshing={overview.isFetching && !overview.isLoading} onRefresh={overview.refetch}>
      {!homeServices && !healthcare && !shopping && !analytics && (
        <EmptyState icon="apps-outline" title="No modules" message="Your account doesn't manage any module. Ask a super admin if you need one." />
      )}

      {homeServices && (
        <Section title="Home services">
          <Card style={styles.card}>
            <ModuleHead icon="construct-outline" title="Home services" subtitle="Bookings, disputes, payouts and providers" count={waiting('dispute')} countLabel="open disputes" />
            <View style={styles.rows}>
              {homeServiceRows.map((row, i) => (
                <ListRow
                  key={row.route}
                  title={row.title}
                  subtitle={row.subtitle}
                  icon={row.icon}
                  onPress={() => navigation.navigate(row.route)}
                  divider={i < homeServiceRows.length - 1}
                />
              ))}
            </View>
          </Card>
        </Section>
      )}

      {(healthcare || shopping) && (
        <Section title="Other modules">
          {healthcare && (
            <Card style={styles.card}>
              <ModuleHead
                icon="medkit-outline"
                title="Healthcare"
                subtitle="Doctors, appointments, clinics, reviews and settings"
                count={waiting('doctor_approval')}
                countLabel="to verify"
                onPress={() => navigation.navigate('AdminHealthcareDashboard')}
              />
            </Card>
          )}
          {shopping && (
            <Card style={styles.card}>
              <ModuleHead
                icon="bag-handle-outline"
                title="Shopping"
                subtitle="Brands, outlets, banners, orders and settings"
                count={waiting('brand_approval')}
                countLabel="to approve"
                onPress={() => navigation.navigate('AdminShopping')}
              />
            </Card>
          )}
        </Section>
      )}

      {analytics && (
        <Section title="Platform">
          <Card style={styles.card}>
            <ModuleHead
              icon="pulse-outline"
              title="Platform analytics"
              subtitle="Live usage, demand forecasts, leaderboards and ML models"
              count={null}
              countLabel=""
              onPress={() => navigation.navigate('PlatformAnalytics')}
            />
          </Card>
        </Section>
      )}
    </AdminScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { padding: 0, marginBottom: S.sm, overflow: 'hidden' },
    head: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg },
    pressed: { backgroundColor: c.surfaceSunken },
    well: { width: 48, height: 48, borderRadius: R.card, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    headText: { flex: 1, minWidth: 0 },
    headTitle: { ...T.subhead, color: c.ink },
    headSub: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    rows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingHorizontal: S.lg },
  });
