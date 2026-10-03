// ============================================================================
// Admin permissions in the UI.
//
//   const canRefund = usePermission('canManageHomeServices', 'canManageFinance');
//
// The profile carries EFFECTIVE permissions (a super admin has every flag), so
// this is a lookup, not a policy. The server enforces the same flags on every
// route — hiding a button is a courtesy, never the protection.
// ============================================================================

import { useAppSelector } from './useReduxHooks';
import { selectAdminProfile } from '../screens/admin/auth/adminAuthSlice';
import type { AdminProfile } from '../networks/admin/auth';

export type PermissionKey =
  | 'canApproveProviders'
  | 'canManageUsers'
  | 'canManagePosts'
  | 'canViewAnalytics'
  | 'canManageNotifications'
  | 'canManageShopping'
  | 'canManageHealthcare'
  | 'canManageHomeServices'
  | 'canManageFinance'
  | 'canBroadcast'
  | 'canViewAudit'
  | 'canManageSettings'
  | 'canManageAdmins';

/** True when `admin` holds every one of `flags`. */
export const hasPermission = (admin: AdminProfile | null | undefined, ...flags: PermissionKey[]): boolean =>
  !!admin && (admin.isSuperAdmin || flags.every((flag) => admin.permissions?.[flag] === true));

export const useAdminProfile = (): AdminProfile | null => useAppSelector(selectAdminProfile);

export const usePermission = (...flags: PermissionKey[]): boolean => hasPermission(useAdminProfile(), ...flags);

export const useIsSuperAdmin = (): boolean => !!useAdminProfile()?.isSuperAdmin;
