// ============================================================================
// Navigation ref — lets non-React code navigate.
//
// Needed because a push-notification tap is handled outside the component tree
// (the listener fires from expo-notifications, which has no access to the
// navigation prop), and a "message" notification must open the right chat.
// ============================================================================

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './Base';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navigate if the container is mounted; no-ops during cold start. */
export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    // @ts-expect-error — the param map is checked at the call sites.
    navigationRef.navigate(name, params);
  }
}

export function isNavigationReady() {
  return navigationRef.isReady();
}
