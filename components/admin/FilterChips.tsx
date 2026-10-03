import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '../ui';
import { GUTTER, S } from '../../theme';

/**
 * A single-choice filter as a scrolling row of chips, with counts when the
 * server sends them (meta.counts). Options come from /admin/meta, never from a
 * list in the screen.
 */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

const FilterChips: React.FC<{ options: FilterOption[]; value: string; onChange: (value: string) => void }> = ({ options, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroller}>
    {options.map((o) => (
      <Chip key={o.value} label={o.label} count={o.count} selected={o.value === value} onPress={() => onChange(o.value)} style={styles.chip} />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  scroller: { marginHorizontal: -GUTTER, flexGrow: 0 },
  row: { paddingHorizontal: GUTTER, paddingBottom: S.md, gap: S.sm },
  chip: { marginRight: 0 },
});

export default FilterChips;
