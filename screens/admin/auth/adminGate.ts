// ============================================================================
// Admin route guard — the decision, kept pure so it is testable.
//
// Every admin route renders through AdminGate (components/admin/AdminGate.tsx),
// which asks this function what to do. That covers deep links and relaunches
// too: a route reached without a session goes to sign-in, and a restricted
// session can only reach the screen that lifts the restriction.
// ============================================================================

import type { AdminAuthStatus } from './adminAuthSlice';
import type { SessionRestriction } from '../../../networks/admin/auth';

export const ADMIN_AUTH_ROUTES = {
  // No separate admin sign-in screen: the admin signs in on the regular one.
  signIn: 'SignIn',
  totp: 'AdminTotp',
  changePassword: 'AdminChangePassword',
  enrol: 'AdminTwoFactorEnrol',
} as const;

/** Where a restricted session is sent, and the routes it may still open. */
const RESTRICTED_TO: Record<Exclude<SessionRestriction, null>, { home: string; allowed: string[] }> = {
  password_change: { home: ADMIN_AUTH_ROUTES.changePassword, allowed: [ADMIN_AUTH_ROUTES.changePassword] },
  totp_enrol: { home: ADMIN_AUTH_ROUTES.enrol, allowed: [ADMIN_AUTH_ROUTES.enrol] },
};

export type GateDecision =
  | { kind: 'restore' }
  | { kind: 'wait' }
  | { kind: 'offline' }
  | { kind: 'redirect'; route: string }
  | { kind: 'render' };

export function adminGateDecision(status: AdminAuthStatus, restrict: SessionRestriction, routeName: string): GateDecision {
  switch (status) {
    case 'unknown':
      return { kind: 'restore' };
    case 'restoring':
      return { kind: 'wait' };
    case 'offline':
      return { kind: 'offline' };
    case 'signedOut':
      return { kind: 'redirect', route: ADMIN_AUTH_ROUTES.signIn };
    case 'signedIn': {
      if (!restrict) return { kind: 'render' };
      const rule = RESTRICTED_TO[restrict];
      return rule.allowed.includes(routeName) ? { kind: 'render' } : { kind: 'redirect', route: rule.home };
    }
    default:
      return { kind: 'redirect', route: ADMIN_AUTH_ROUTES.signIn };
  }
}

/** The first screen after signing in. */
export const ADMIN_HOME_ROUTE = 'AdminHome';

export const landingAfterSignIn = (restrict: SessionRestriction): string =>
  restrict ? RESTRICTED_TO[restrict].home : ADMIN_HOME_ROUTE;
