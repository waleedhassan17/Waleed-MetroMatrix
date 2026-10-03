import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { EmptyState, ErrorState, SkeletonCard } from '../ui';
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
  if (isLoading) {
    return (
      <>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </>
    );
  }
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} style={style} />;
  return <>{children}</>;
};

export default QueryState;
