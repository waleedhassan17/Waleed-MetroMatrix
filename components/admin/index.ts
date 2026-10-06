// ============================================================================
// The admin console kit, on top of components/ui.
//
// Rules the kit holds so screens don't have to: one accent (the admin module
// palette), one gradient — the page header AppBar draws — and no other, two
// radii (R.control, R.card), hairlines instead of shadows, status colour only
// from /admin/meta tones, chart series in the services' own colours
// (chartColors), "—" for anything the server did not send.
// ============================================================================

export { default as AdminScreen } from './AdminScreen';
export type { AdminScreenProps, HeaderAction } from './AdminScreen';
export { default as AdminGate, withAdminGate } from './AdminGate';
export { default as BarList } from './BarList';
export type { BarListItem } from './BarList';
export { providerTypeColor, seriesColor, toneColor } from './chartColors';
export type { ProviderTypeKey } from './chartColors';
export { default as ConfirmSheet } from './ConfirmSheet';
export { default as DonutChart, donutArcs } from './DonutChart';
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
export { default as SplitBar, sharePercent } from './SplitBar';
export type { SplitSegment } from './SplitBar';
export { default as StatusBadge } from './StatusBadge';
export { default as StatusTimeline, describeAction, lookOf } from './StatusTimeline';
export { default as TrendChart, bucketLabel } from './TrendChart';
export type { TrendPoint, TrendChartProps } from './TrendChart';
export type { TimelineEntry } from './StatusTimeline';
