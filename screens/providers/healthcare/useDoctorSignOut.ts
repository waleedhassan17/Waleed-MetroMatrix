import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { performLogout } from '../../../services/auth/logout';

/**
 * Sign the doctor out: confirm, end the session, return to role selection.
 *
 * The profile's Sign Out used to call `performLogout(navigation)`. That
 * function takes the Redux dispatch, so it cleared the stored token and then
 * threw on `dispatch(resetAllState())` before resetting state or navigating —
 * the doctor stayed on the profile screen, apparently still signed in, with no
 * session underneath. One shared hook, so every entry point does it the same
 * way as the other roles.
 */
export function useDoctorSignOut() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const signOut = useCallback(async () => {
    await performLogout(dispatch);

    // The doctor screens live in DoctorStack, nested inside the root navigator;
    // RoleSelection is a ROOT route. Reset from the top rather than relying on
    // an unhandled reset bubbling up out of the nested stack.
    let root = navigation;
    while (root?.getParent?.()) root = root.getParent();
    root.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
  }, [dispatch, navigation]);

  return useCallback(() => {
    Alert.alert('Sign out', 'Sign out of your doctor account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  }, [signOut]);
}
