import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { restoreAdminSession, selectAdminAuth } from '../../screens/admin/auth/adminAuthSlice';
import { adminGateDecision } from '../../screens/admin/auth/adminGate';
import { useTheme } from '../../theme';
import { ErrorState, Screen } from '../ui';

/**
 * Wraps every admin route (see BaseNavigator). Without a verified admin
 * session the route goes to AdminSignIn; a restricted session goes to the
 * screen that lifts the restriction. The decision itself is
 * screens/admin/auth/adminGate.ts.
 */
const AdminGate: React.FC<{ routeName: string; children: React.ReactNode }> = ({ routeName, children }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { status, restrict } = useAppSelector(selectAdminAuth);
  const decision = adminGateDecision(status, restrict, routeName);
  const redirectTo = decision.kind === 'redirect' ? decision.route : null;

  useEffect(() => {
    if (decision.kind === 'restore') dispatch(restoreAdminSession());
  }, [decision.kind, dispatch]);

  useEffect(() => {
    if (redirectTo) navigation.reset({ index: 0, routes: [{ name: redirectTo }] });
  }, [redirectTo, navigation]);

  if (decision.kind === 'render') return <>{children}</>;

  if (decision.kind === 'offline') {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState
          title="Can't reach the server"
          message="Your admin session couldn't be checked. Check the connection and try again."
          onRetry={() => dispatch(restoreAdminSession())}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.centre} accessibilityLabel="Checking your admin session">
        <ActivityIndicator color={colors.inkMuted} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const gatedCache = new Map<string, React.ComponentType<any>>();

/** `Screen` wrapped in AdminGate for route `routeName` (memoised: component identity must be stable). */
export function withAdminGate(routeName: string, Screen: React.ComponentType<any>): React.ComponentType<any> {
  const cached = gatedCache.get(routeName);
  if (cached) return cached;
  const Gated: React.ComponentType<any> = (props) => (
    <AdminGate routeName={routeName}>
      <Screen {...props} />
    </AdminGate>
  );
  Gated.displayName = `AdminGate(${routeName})`;
  gatedCache.set(routeName, Gated);
  return Gated;
}

export default AdminGate;
