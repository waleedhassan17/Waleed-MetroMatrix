import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import ActionSheet from '../components/ui/ActionSheet';

/**
 * Ask before leaving a screen with unsaved edits.
 *
 * The notes editor only asked when its own close button was used; Android's
 * back button and the iOS swipe left without a word, and the prescription
 * writer and availability editor never asked at all. `beforeRemove` fires for
 * every way a screen can be left.
 *
 * Render the returned `sheet`. Call `allowLeave()` right before navigating away
 * after a successful save, so the guard does not ask about changes just saved.
 */
export function useUnsavedChangesGuard(
  dirty: boolean,
  {
    title = 'Discard changes?',
    message = 'You have changes that have not been saved.',
  }: { title?: string; message?: string } = {}
) {
  const navigation = useNavigation<any>();
  const dirtyRef = useRef(dirty);
  const pendingAction = useRef<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event: any) => {
        if (!dirtyRef.current) return;
        event.preventDefault();
        pendingAction.current = event.data.action;
        setVisible(true);
      }),
    [navigation]
  );

  const allowLeave = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  const discard = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    dirtyRef.current = false;
    if (action) navigation.dispatch(action);
  }, [navigation]);

  const sheet = (
    <ActionSheet
      visible={visible}
      title={title}
      message={message}
      cancelLabel="Keep editing"
      onClose={() => setVisible(false)}
      options={[{ label: 'Discard changes', icon: 'trash-outline', tone: 'destructive', onPress: discard }]}
    />
  );

  return { sheet, allowLeave };
}

export default useUnsavedChangesGuard;
