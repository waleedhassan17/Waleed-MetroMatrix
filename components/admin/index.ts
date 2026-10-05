// ============================================================================
// The admin console kit, on top of components/ui.
//
// Rules the kit holds so screens don't have to: one accent (the admin module
// palette), no gradients, two radii (R.control, R.card), hairlines instead of
// shadows, status colour only from /admin/meta tones, "—" for anything the
// server did not send.
// ============================================================================

export { default as AdminScreen } from './AdminScreen';
export type { AdminScreenProps, HeaderAction } from './AdminScreen';
export { default as AdminGate, withAdminGate } from './AdminGate';
export { default as BarList } from './BarList';
export type { BarListItem } from './BarList';
export { default as ConfirmSheet } from './ConfirmSheet';
export type { ConfirmSheetProps } from './ConfirmSheet';
export { default as EntityRow } from './EntityRow';
export type { EntityRowProps } from './EntityRow';
export { default as FilterChips } from './FilterChips';
export type { FilterOption } from './FilterChips';
export { default as ForbiddenState } from './ForbiddenState';
export { KpiGrid, KpiTile } from './KpiTile';
export type { KpiTileProps } from './KpiTile';
export { default as PermissionGate } from './PermissionGate';
export { default as QueryState } from './QueryState';
export { default as Section, DetailRow } from './Section';
export { default as StatusBadge } from './StatusBadge';
export { default as StatusTimeline, describeAction, lookOf } from './StatusTimeline';
export { default as TrendChart, bucketLabel } from './TrendChart';
export type { TrendPoint, TrendChartProps } from './TrendChart';
export type { TimelineEntry } from './StatusTimeline';
