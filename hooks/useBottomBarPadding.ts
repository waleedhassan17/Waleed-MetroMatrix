import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom padding for a fixed action bar (`position: 'absolute', bottom: 0`).
 *
 * `SafeAreaView` imported from `react-native` is iOS-only — on Android it is a
 * plain View that applies no insets. A bar pinned to `bottom: 0` therefore sits
 * *underneath* the system navigation bar, and taps on it go to the OS instead
 * of the app: the button looks perfectly normal and simply does not respond.
 *
 * On iOS the RN SafeAreaView already insets the container, so only Android
 * needs the extra room. Returns 0 extra on devices using gesture navigation,
 * where `insets.bottom` is 0.
 */
export function useBottomBarPadding(base: number = 16): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? base : base + insets.bottom;
}

export default useBottomBarPadding;
