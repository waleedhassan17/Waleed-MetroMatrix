import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { onAdminRestricted, onAdminSessionRefreshed, onSessionEnded } from '../../networks/network/authEvents';
import { refreshSessionOnce } from '../../networks/network/network';
import { loadAdminSession } from '../../networks/admin/session';
import { startAdminRefreshScheduler, type RefreshSchedule } from '../../networks/admin/refreshScheduler';
import { restrictionFrom, type AdminProfile } from '../../networks/admin/auth';
import {
  adminProfileReceived,
  adminRestrictionChanged,
  adminSignedOut,
} from '../../screens/admin/auth/adminAuthSlice';
import { adminApi } from '../../networks/admin/adminApi';
import { ToastHost } from '../ui';

/**
 * Keeps the admin session in step with the server while the app runs.
 * Mounted once, in AppContainer.
 *
 *  - Session ended by the network layer (refresh failed for good) → signed
 *    out with a notice; AdminGate then moves an open admin screen to sign-in.
 *  - A refresh returned a new profile/restriction → store it.
 *  - A call was refused because a policy now restricts the session → store
 *    it; AdminGate moves the admin to the screen that fixes it.
 *  - While signed in and in the foreground, renew the token a minute before
 *    it expires.
 *
 * Also hosts the admin console's toasts.
 */
const AdminSessionManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.adminAuth.status);
  const schedule = useRef<RefreshSchedule | null>(null);

  useEffect(() => {
    const offEnded = onSessionEnded((audience, reason) => {
      if (audience !== 'admin') return;
      dispatch(adminApi.util.resetApiState());
      dispatch(
        adminSignedOut({
          notice: reason === 'signed_out' ? undefined : 'Your admin session has ended. Please sign in again.',
        })
      );
    });
    const offRefreshed = onAdminSessionRefreshed(({ admin, restrict }) => {
      if (admin) dispatch(adminProfileReceived(admin as AdminProfile));
      dispatch(adminRestrictionChanged(restrictionFrom(restrict)));
      schedule.current?.reschedule();
    });
    const offRestricted = onAdminRestricted((restrict) => dispatch(adminRestrictionChanged(restrict)));
    return () => {
      offEnded();
      offRefreshed();
      offRestricted();
    };
  }, [dispatch]);

  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    const started = startAdminRefreshScheduler({
      getExpiry: async () => (await loadAdminSession())?.accessTokenExpiresAt ?? null,
      refresh: () => refreshSessionOnce('admin'),
      appState: AppState,
    });
    schedule.current = started;
    return () => {
      started.stop();
      schedule.current = null;
    };
  }, [status]);

  return status === 'signedIn' ? <ToastHost bottomOffset={16} /> : null;
};

export default AdminSessionManager;
