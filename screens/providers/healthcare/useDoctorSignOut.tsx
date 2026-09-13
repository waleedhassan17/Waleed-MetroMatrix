import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';

import ActionSheet from '../../../components/ui/ActionSheet';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { performLogout } from '../../../services/auth/logout';

/**
 * Sign the doctor out: confirm in an in-app sheet, end the session, return to
 * role selection.
 *
 * The confirmation used to be a native Alert — the dark system dialog that
 * floated over the light app. Render the returned `sheet` once on the screen
 * that offers sign-out, and call `requestSignOut` from the control.
 */
export function useDoctorSignOut() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const [visible, setVisible] = useState(false);

  const signOut = useCallback(async () => {
    await performLogout(dispatch);

    // The doctor screens live in DoctorStack, nested inside the root navigator;
    // RoleSelection is a ROOT route. Reset from the top rather than relying on
    // an unhandled reset bubbling up out of the nested stack.
    let root = navigation;
    while (root?.getParent?.()) root = root.getParent();
    root.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
  }, [dispatch, navigation]);

  const requestSignOut = useCallback(() => setVisible(true), []);

  const sheet = (
    <ActionSheet
      visible={visible}
      title="Sign out?"
      message="You can sign back in at any time. Your schedule and patients stay as they are."
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

export default useDoctorSignOut;
