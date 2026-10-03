import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatAgo, formatDateTime } from '../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * What admins have done to this record, newest first — from the audit log
 * (`history[]` on provider and user detail). Who, what, why, when.
 */
export interface TimelineEntry {
  id: string;
  action: string;
  actor?: { id?: string; name?: string; role?: string };
  reason?: string | null;
  createdAt: string;
}

const VERBS: Record<string, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  suspend: 'Suspended',
  unsuspend: 'Suspension lifted',
  delete: 'Deleted',
  restore: 'Restored',
  activate: 'Activated',
  deactivate: 'Deactivated',
  create: 'Created',
  update: 'Updated',
};

/** 'provider.unsuspend' → 'Suspension lifted'; unknown actions are spelled out, not hidden. */
export function describeAction(action: string): string {
  const verb = action.split('.').pop() || action;
  if (VERBS[verb]) return VERBS[verb];
  const words = verb.replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : action;
}

const StatusTimeline: React.FC<{ entries: TimelineEntry[] }> = ({ entries }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!entries.length) return <Text style={styles.empty}>No admin actions on this record yet.</Text>;

  return (
    <View>
      {entries.map((e, i) => (
        <View key={e.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={styles.dot} />
            {i < entries.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <Text style={styles.action}>{describeAction(e.action)}</Text>
            <Text style={styles.meta} accessibilityLabel={`${e.actor?.name || 'An admin'}, ${formatDateTime(e.createdAt)}`}>
              {(e.actor?.name || 'An admin') + ' · ' + formatAgo(e.createdAt)}
            </Text>
            {!!e.reason && <Text style={styles.reason}>“{e.reason}”</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row' },
    rail: { width: 20, alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 6 },
    line: { flex: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: c.line, marginVertical: 2 },
    body: { flex: 1, paddingBottom: S.lg, paddingLeft: S.sm },
    action: { ...T.bodyStrong, color: c.ink },
    meta: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    reason: { ...T.body, color: c.ink, marginTop: S.xs },
    empty: { ...T.body, color: c.inkMuted },
  });

export default StatusTimeline;
