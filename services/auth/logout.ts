// ============================================================================
// The one way to end a session.
//
// Before this existed, "Logout" on the provider profile did nothing but
// navigation.reset() to the role picker. The screen changed; the session did
// not. Provider A's JWT stayed in storage under accessToken /
// providerAccessToken, every Redux slice kept A's data, the socket stayed
// connected as A, and push notifications kept routing to A. Signing in as
// provider B then produced a session that was part B and part A — B's name on
// one screen, A's on another, and A's jobs in the list.
//
// Four things have to end together, so they live in one function rather than
// being re-remembered at each call site:
//   1. stored credentials   (else the next request re-authenticates as A)
//   2. Redux                (else screens render A until they happen to refetch)
//   3. the socket           (else live events keep arriving for A)
//   4. push registration    (else A's calls ring on this device)
// ============================================================================

import type { Dispatch } from '@reduxjs/toolkit';
import { logoutApi } from '../../networks/authcalls/me';
import { clearAuthData } from '../../utils/storage_utils/storageUtils';
import { disconnectSocket } from '../socket/socketClient';
import { unregisterPushOnLogout } from '../push/pushNotifications';
import { resetAllState } from '../../store/store';
import { logout as appContainerLogout } from '../../components/app-container/appContainerSlice';

/**
 * End the current session completely.
 *
 * Every step is best-effort and independent: a failed server call or a push
 * service that is unreachable must never leave the user still signed in
 * locally. Await this before navigating so no screen re-reads a token that is
 * about to be deleted.
 */
export async function performLogout(dispatch: Dispatch): Promise<void> {
  // Stop live traffic first — a socket that survives the token being cleared
  // reconnects with a credential we are in the middle of deleting.
  try {
    disconnectSocket();
  } catch (e) {
    console.log('[logout] socket teardown failed:', e);
  }

  // Needs the token, so it has to happen before storage is cleared.
  try {
    await unregisterPushOnLogout();
  } catch (e) {
    console.log('[logout] push unregister failed:', e);
  }

  // Tells the server, then clears every auth key locally.
  try {
    await logoutApi();
  } catch (e) {
    console.log('[logout] logout API failed, clearing locally:', e);
  }

  // logoutApi() clears storage on both paths, but a throw before it reached
  // that point would leave the token behind — which is the whole bug. Cheap
  // insurance.
  try {
    await clearAuthData();
  } catch (e) {
    console.log('[logout] clearAuthData failed:', e);
  }

  // Drop every account-scoped slice back to its initial state.
  dispatch(resetAllState());

  // The app-shell slice deliberately SURVIVES that reset — it holds the boot
  // flags the whole UI is gated on, and resetting it would strand the app on
  // its loading spinner. So clear the identity inside it explicitly: this
  // nulls currentUser / currentProvider / userType while leaving isAppReady
  // and the onboarding flag intact.
  dispatch(appContainerLogout());
}
