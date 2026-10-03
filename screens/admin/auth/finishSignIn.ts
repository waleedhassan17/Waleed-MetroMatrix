import type { AppDispatch } from '../../../store/store';
import { resetAllState } from '../../../store/store';
import type { AdminProfile, SessionRestriction } from '../../../networks/admin/auth';
import { adminApi } from '../../../networks/admin/adminApi';
import { adminSignedIn } from './adminAuthSlice';
import { landingAfterSignIn } from './adminGate';

/**
 * After a successful sign-in: drop whatever the previous account left in the
 * store, record the admin, and open the console — or, for a restricted
 * session, the screen that lifts the restriction.
 */
export function finishAdminSignIn(
  dispatch: AppDispatch,
  navigation: { reset: (state: { index: number; routes: { name: string }[] }) => void },
  result: { admin: AdminProfile; restrict: SessionRestriction }
): void {
  dispatch(resetAllState(true));
  dispatch(adminApi.util.resetApiState());
  dispatch(adminSignedIn({ admin: result.admin, restrict: result.restrict }));
  navigation.reset({ index: 0, routes: [{ name: landingAfterSignIn(result.restrict) }] });
}
