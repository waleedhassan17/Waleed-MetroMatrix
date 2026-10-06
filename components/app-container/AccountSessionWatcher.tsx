import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { emitSessionEnded, onSessionEnded, type SessionEndReason } from '../../networks/network/authEvents';
import { navigationRef } from '../../navigation-maps/navigationRef';
import { performLogout } from '../../services/auth/logout';
import { KeyForStorage } from '../../utils/storage_utils/storageUtils';

/**
 * Ends a user or provider session the app can no longer use.
 *
 * When a refresh fails for good, the interceptor clears the stored tokens and
 * emits onSessionEnded('account') — but nothing listened for that audience
 * (AdminSessionManager only handles 'admin'). The app stayed on whatever
 * screen was open while every request went out without a token: a
 * signed-in-looking screen that loaded nothing, and no word about why.
 *
 * On web it also follows a sign-out in another tab: the tabs share
 * localStorage, so that sign-out removed the tokens this tab reads on every
 * request, and nothing else would have told it.
 *
 * A hook, called by AppContainer before its boot screen, because the session
 * most often turns out to be dead during boot itself — a page reload after the
 * refresh token was revoked — when no navigator is mounted yet. The notice
 * then waits for the navigator: pass `onNavigationReady` to its `onReady`.
 */
export function useAccountSessionWatcher(): { onNavigationReady: () => void } {
  const dispatch = useAppDispatch();
  const userType = useAppSelector((state) => state.appContainer.userType);
  const signedIn = useAppSelector((state) => !!(state.appContainer.currentUser || state.appContainer.currentProvider));

  // Several in-flight requests fail together when a session dies; sign out
  // and tell the user once. Re-armed by the next sign-in.
  const ended = useRef(false);
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  useEffect(() => {
    if (signedIn) ended.current = false;
  }, [signedIn]);

  // Read at event time: performLogout clears it from the store.
  const userTypeRef = useRef(userType);
  userTypeRef.current = userType;

  // A notice waiting for both the sign-out to finish and a navigator to show it on.
  const pending = useRef<{ reason: SessionEndReason; signIn: string; loggedOut: boolean } | null>(null);

  const flush = useCallback(() => {
    const notice = pending.current;
    if (!notice || !notice.loggedOut || !navigationRef.isReady()) return;
    pending.current = null;
    navigationRef.reset({ index: 0, routes: [{ name: notice.signIn as never }] });
    Alert.alert(
      notice.reason === 'signed_out' ? 'Signed out' : 'Session ended',
      notice.reason === 'signed_out'
        ? 'You signed out in another window. Please sign in again.'
        : 'Your session has ended. Please sign in again.'
    );
  }, []);

  useEffect(
    () =>
      onSessionEnded((audience, reason) => {
        if (audience !== 'account' || ended.current) return;
        ended.current = true;
        const notice = {
          reason,
          signIn: userTypeRef.current === 'provider' ? 'ProviderSignIn' : 'SignIn',
          loggedOut: false,
        };
        pending.current = notice;
        void (async () => {
          await performLogout(dispatch);
          notice.loggedOut = true;
          flush();
        })();
      }),
    [dispatch, flush]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onStorage = (event: StorageEvent) => {
      // key null: the other tab cleared all of storage.
      if (event.key !== null && event.key !== KeyForStorage.accessToken) return;
      if (!signedInRef.current || window.localStorage.getItem(KeyForStorage.accessToken)) return;
      emitSessionEnded('account', 'signed_out');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { onNavigationReady: flush };
}
