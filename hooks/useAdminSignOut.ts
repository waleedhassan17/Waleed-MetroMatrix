// ============================================================================
// Sign out of the admin console — this device, or every device.
//
// Ends the server session (best effort: offline still signs out locally),
// drops the console's cached server data, and returns to the app's regular
// sign-in screen (admins sign in there too; there is no separate staff one).
// ============================================================================

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch } from './useReduxHooks';
import { adminApi } from '../networks/admin/adminApi';
import { signOutAdmin } from '../networks/admin/auth';
import { adminSignedOut } from '../screens/admin/auth/adminAuthSlice';
import { resetAllState } from '../store/store';

export function useAdminSignOut() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  return useCallback(
    async ({ everywhere = false }: { everywhere?: boolean } = {}) => {
      await signOutAdmin({ everywhere });
      dispatch(adminApi.util.resetApiState());
      // Nothing the console loaded outlives the session (same as performLogout).
      dispatch(resetAllState());
      dispatch(adminSignedOut());
      navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
    },
    [dispatch, navigation]
  );
}
