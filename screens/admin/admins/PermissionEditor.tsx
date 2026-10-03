import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Chip } from '../../../components/ui';
import type { ConsoleMeta } from '../../../networks/admin/adminApi';
import { S, T, useTheme, type ThemeColors } from '../../../theme';

/**
 * Role and permission flags, from /admin/meta. Picking a role applies its
 * preset; flags can then be adjusted one by one. A super admin holds every
 * permission, so their flags are not editable.
 */
export interface PermissionEditorProps {
  meta: ConsoleMeta;
  role: string;
  permissions: Record<string, boolean>;
  onChange: (next: { role: string; permissions: Record<string, boolean> }) => void;
  disabled?: boolean;
}

type Role = { value: string; label: string; description?: string; preset?: Record<string, boolean> };

const PermissionEditor: React.FC<PermissionEditorProps> = ({ meta, role, permissions, onChange, disabled }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const roles = meta.roles as Role[];
  const current = roles.find((r) => r.value === role);
  const isSuper = role === 'super_admin';

  return (
    <View>
      <Text style={styles.label}>Role</Text>
      <View style={styles.roles}>
        {roles.map((r) => (
          <Chip
            key={r.value}
            label={r.label}
            selected={r.value === role}
            disabled={disabled}
            onPress={() => onChange({ role: r.value, permissions: { ...(r.preset ?? {}) } })}
          />
        ))}
      </View>
      {!!current?.description && <Text style={styles.help}>{current.description}</Text>}

      <Text style={[styles.label, styles.gap]}>Permissions</Text>
      {meta.permissions.map((p, i) => (
        <View key={p.key} style={[styles.row, i < meta.permissions.length - 1 && styles.divider]}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{p.label}</Text>
            <Text style={styles.rowHelp}>{p.description}</Text>
          </View>
          <Switch
            value={isSuper || permissions[p.key] === true}
            disabled={disabled || isSuper}
            onValueChange={(v) => onChange({ role, permissions: { ...permissions, [p.key]: v } })}
            trackColor={{ true: colors.accent, false: colors.line }}
            thumbColor={colors.surface}
            accessibilityLabel={p.label}
          />
        </View>
      ))}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    gap: { marginTop: S.xl },
    roles: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    help: { ...T.caption, color: c.inkMuted, marginTop: S.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    rowText: { flex: 1 },
    rowTitle: { ...T.body, color: c.ink },
    rowHelp: { ...T.caption, color: c.inkMuted, marginTop: 2 },
  });

export default PermissionEditor;
