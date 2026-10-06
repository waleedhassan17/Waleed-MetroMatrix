// ============================================================================
// Alert.alert for the web build.
//
// react-native-web ships Alert as `static alert() {}` — a no-op. Every
// Alert.alert in the app therefore did nothing on web: errors were silent, and
// every step that only runs from a button inside an alert could never happen
// (signing out, moving on after sign-up or a password reset, choosing a
// profile photo). installWebAlert() points Alert.alert at the queue below,
// which WebAlertHost (components/ui/WebAlertHost.tsx) renders as a modal with
// every button. Native keeps its own Alert untouched.
// ============================================================================

import { Alert, Platform, type AlertButton, type AlertOptions } from 'react-native';

export interface WebAlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

type Listener = (queue: readonly WebAlertRequest[]) => void;

let queue: WebAlertRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const publish = () => {
  for (const listener of [...listeners]) listener(queue);
};

/** Same signature as Alert.alert. With no buttons, shows a single OK, as native does. */
export const showWebAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): void => {
  queue = [...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options }];
  publish();
};

/** Receive the queue now and on every change; the first entry is the one on screen. */
export const subscribeWebAlerts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Close alert `id`, then run the pressed button's onPress — or, with no
 * button, the dismissal callback. Closing first means an alert opened from
 * inside onPress queues behind nothing and shows straight away.
 */
export const resolveWebAlert = (id: number, button?: AlertButton): void => {
  const request = queue.find((r) => r.id === id);
  if (!request) return;
  queue = queue.filter((r) => r.id !== id);
  publish();
  if (button) button.onPress?.();
  else request.options?.onDismiss?.();
};

/** Route Alert.alert to the web queue. Does nothing on native. */
export const installWebAlert = (os: string = Platform.OS): void => {
  if (os !== 'web') return;
  Alert.alert = showWebAlert;
};

/** Tests only: forget queued alerts. */
export const __resetWebAlerts = (): void => {
  queue = [];
  publish();
};
