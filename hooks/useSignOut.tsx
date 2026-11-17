import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';

import ActionSheet from '../components/ui/ActionSheet';
import { performLogout } from '../services/auth/logout';
import { useAppDispatch } from './useReduxHooks';

export interface SignOutCopy {
  /** Sheet title. Defaults to "Sign out?". */
  title?: string;
  /** One reassuring line under the title — what signing out does NOT lose. */
  message?: string;
}

/**
 * Sign out from any screen: confirm in an in-app sheet, end the session, return
 * to role selection.
 *
 * Render the returned `sheet` once on the screen that offers sign-out and call
 * `requestSignOut` from the control. The session is ended by `performLogout`
 * (credentials, Redux, socket, push — see services/auth/logout.ts), so a call
 * site never has to remember those four things itself.
 */
export function useSignOut({ title = 'Sign out?', message = 'You can sign back in at any time.' }: SignOutCopy = {}) {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const [visible, setVisible] = useState(false);

  const signOut = useCallback(async () => {
    await performLogout(dispatch);

    // Profile and settings screens live in nested stacks and tabs, while
    // RoleSelection is a ROOT route. Reset from the top rather than relying on
    // an unhandled reset bubbling up out of the nested navigator.
    let root = navigation;
    while (root?.getParent?.()) root = root.getParent();
    root.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
  }, [dispatch, navigation]);

  const requestSignOut = useCallback(() => setVisible(true), []);

  const sheet = (
    <ActionSheet
      visible={visible}
      title={title}
      message={message}
      onClose={() => setVisible(false)}
      options={[
        {
          label: 'Sign out',
          icon: 'log-out-outline',
          tone: 'destructive',
          onPress: () => {
            signOut();
          },
        },
      ]}
    />
  );

  return { requestSignOut, sheet };
}

export default useSignOut;
