import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { ToneBadge } from '../ui';
import { presentStatus, useAdminMeta, type EnumGroup } from '../../hooks/useAdminMeta';

/**
 * A status as the server describes it: its label and semantic tone come from
 * /admin/meta, so a new status on the server shows correctly without an app
 * release, and an unknown one shows as itself in neutral.
 */
const StatusBadge: React.FC<{ group: EnumGroup; value: string | null | undefined; style?: StyleProp<ViewStyle> }> = ({ group, value, style }) => {
  const { data: meta } = useAdminMeta();
  const { label, tone } = presentStatus(meta, group, value);
  return <ToneBadge label={label} tone={tone} style={style} />;
};

export default StatusBadge;
