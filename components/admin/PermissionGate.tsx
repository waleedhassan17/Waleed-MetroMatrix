import React from 'react';

import { usePermission, type PermissionKey } from '../../hooks/useAdminPermission';
import ForbiddenState from './ForbiddenState';

/**
 * Render `children` only for an admin holding every permission in `all`.
 *
 *   <PermissionGate all={['canManageFinance']} fallback={null}>
 *     <Button label="Refund" … />
 *   </PermissionGate>
 *
 * Without a `fallback` it shows ForbiddenState — right for a whole screen or
 * section. For an action button pass `fallback={null}`: a missing button needs
 * no explanation, and a lock icon on every row is noise.
 */
export interface PermissionGateProps {
  all: PermissionKey[];
  /** Used by the default fallback: "Your account isn't allowed to {action}." */
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ all, action, fallback, children }) => {
  const allowed = usePermission(...all);
  if (allowed) return <>{children}</>;
  return <>{fallback === undefined ? <ForbiddenState action={action} /> : fallback}</>;
};

export default PermissionGate;
