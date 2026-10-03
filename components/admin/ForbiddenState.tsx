import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { EmptyState } from '../ui';

/**
 * What an admin sees when they lack a permission — from a PermissionGate, or
 * when the server answers 403 FORBIDDEN. A generic "Something went wrong"
 * reads as a bug; this says what is missing and who can grant it.
 */
export interface ForbiddenStateProps {
  /** What they were trying to do, as a verb phrase: "approve providers". */
  action?: string;
  /** The server's message, when this comes from a 403. */
  message?: string | null;
  style?: StyleProp<ViewStyle>;
}

const ForbiddenState: React.FC<ForbiddenStateProps> = ({ action, message, style }) => (
  <EmptyState
    icon="lock-closed-outline"
    title="You don't have access"
    message={
      message ||
      (action
        ? `Your account isn't allowed to ${action}. Ask a super admin if you need it.`
        : "Your account isn't allowed to open this. Ask a super admin if you need it.")
    }
    style={style}
  />
);

export default ForbiddenState;
