// ============================================================================
// Shared UI primitives
//
// Built on constants/theme.ts (neutrals, type, radius, elevation) with the
// home-service accent from constants/HomeServiceTheme.ts. Screens compose these
// instead of restyling a header, a card and an empty state each time — which is
// how the module ended up with 10 copies of the same config block and 355
// hardcoded hexes.
// ============================================================================

export { default as ActionSheet } from './ActionSheet';
export type { ActionSheetProps, SheetOption } from './ActionSheet';

export { default as AppBar } from './AppBar';
export type { AppBarProps } from './AppBar';

export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { default as BackButton, BackButtonSpacer } from './BackButton';
export type { BackButtonProps } from './BackButton';

export { default as Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { default as Card } from './Card';
export type { CardProps } from './Card';

export { default as Chip } from './Chip';
export type { ChipProps } from './Chip';

export { default as EmptyState, ErrorState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { default as HeroBanner } from './HeroBanner';
export type { HeroBannerProps } from './HeroBanner';

export { default as Screen } from './Screen';
export type { ScreenProps } from './Screen';

export { default as SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';

export { default as Skeleton, SkeletonCard } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { default as StatusPill } from './StatusPill';
export type { StatusPillProps } from './StatusPill';
