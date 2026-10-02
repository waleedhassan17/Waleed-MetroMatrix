import React from 'react';
import { EmptyState } from '../ui';
import type { ProviderDiscoveryMapProps } from './ProviderDiscoveryMap';

// Web stub: MapLibre React Native is native-only; the list shows the same providers.
export default function ProviderDiscoveryMap(_props: ProviderDiscoveryMapProps) {
  return (
    <EmptyState
      icon="map-outline"
      title="Map is in the mobile app"
      message="The list has the same providers, in the same order."
    />
  );
}
