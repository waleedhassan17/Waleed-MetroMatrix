import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { EmptyState, ErrorState, Skeleton, SkeletonCard } from '../ui';
import { R, S } from '../../theme';
import { adminErrorOf } from '../../networks/admin/adminApi';
import ForbiddenState from './ForbiddenState';

/**
 * Loading, failed, forbidden, empty — or the content.
 *
 * Every admin screen has the same four non-happy states, and every one of
 * them used to be handled differently (or not at all: a failed request left
 * the invented initial figures on screen). Here a failure is always an error
 * with a retry, a 403 is always "you don't have access", and nothing renders
 * until the server has answered.
 */
export interface QueryStateProps {
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  /** Skeleton cards shown while loading. */
  skeletonCount?: number;
  /**
   * The shape of the loading placeholder, matching what will arrive: a grid of
   * KPI tiles, list rows, or a detail page (header + lines). Defaults to cards.
   */
  skeleton?: 'cards' | 'tiles' | 'rows' | 'detail';
  /** What the admin was trying to see, for the forbidden message: "see providers". */
  action?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const QueryState: React.FC<QueryStateProps> = ({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyIcon = 'file-tray-outline',
  skeletonCount = 3,
  skeleton = 'cards',
  action,
  style,
  children,
}) => {
  const failure = adminErrorOf(error);
  if (failure) {
    if (failure.status === 403 && failure.code === 'FORBIDDEN') {
      return <ForbiddenState action={action} message={failure.message} style={style} />;
    }
    return <ErrorState title="Couldn't load this" message={failure.message} onRetry={onRetry} style={style} />;
  }
  if (isLoading) return <Placeholder kind={skeleton} count={skeletonCount} />;
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} style={style} />;
  return <>{children}</>;
};

const Placeholder: React.FC<{ kind: NonNullable<QueryStateProps['skeleton']>; count: number }> = ({ kind, count }) => {
  const n = Array.from({ length: count }, (_, i) => i);
  if (kind === 'tiles') {
    return (
      <View style={styles.tiles} accessibilityLabel="Loading">
        {n.map((i) => (
          <View key={i} style={styles.tileCell}>
            <Skeleton height={96} radius={R.card} />
          </View>
        ))}
      </View>
    );
  }
  if (kind === 'rows') {
    return (
      <View accessibilityLabel="Loading">
        {n.map((i) => (
          <View key={i} style={styles.row}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={styles.rowBody}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={11} style={styles.gap} />
            </View>
            <Skeleton width={56} height={18} radius={R.chip} />
          </View>
        ))}
      </View>
    );
  }
  if (kind === 'detail') {
    return (
      <View accessibilityLabel="Loading">
        <View style={styles.row}>
          <Skeleton width={64} height={64} radius={32} />
          <View style={styles.rowBody}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={12} style={styles.gap} />
          </View>
        </View>
        <Skeleton height={36} radius={R.control} style={styles.block} />
        <SkeletonCard lines={3} />
      </View>
    );
  }
  return (
    <>
      {n.map((i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  tileCell: { width: '50%', padding: S.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md },
  rowBody: { flex: 1, marginHorizontal: S.md },
  gap: { marginTop: 6 },
  block: { marginVertical: S.lg },
});

export default QueryState;
