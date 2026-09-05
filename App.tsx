// Imported per weight, not from the package index. The index is a barrel of
// `require('./<weight>/<face>.ttf')` calls for all 18 Inter and 8 Sora faces,
// and Metro does not tree-shake a module-level require — importing from it
// bundled ~2MB of italics and hairline weights the app never asks for.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import AppContainer from './components/app-container/appContainer';
import { ThemeProvider, useResolvedMode } from './theme';

// Hold the native splash until the faces are in memory. Without this the first
// frame renders in San Francisco / Roboto and then reflows into Inter — the
// text visibly jumps, because the two have different metrics.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (fast refresh, or a second mount). Not an error.
});

/**
 * Main App Component
 *
 * This is the root component of the application.
 * It provides the Redux store to the entire app and renders the AppContainer.
 *
 * The AppContainer handles:
 * - App initialization and loading state
 * - Navigation container setup
 * - Authentication state management
 * - Route determination based on app state
 */
/**
 * The root theme layer.
 *
 * Separate from `App` because `useResolvedMode` reads the store, so it has to
 * run BELOW `<Provider>` — and below `<PersistGate>`, so the value it reads is
 * the rehydrated preference rather than the initial 'system' that would be
 * replaced a frame later. A theme that flickers on every cold start is the
 * thing this ordering avoids.
 *
 * Setting the mode HERE and nowhere else is the whole design: every nested
 * provider inherits it, so a stack that names only its module cannot revert it.
 */
const ThemedApp: React.FC<{ onLayout: () => void }> = ({ onLayout }) => {
  const mode = useResolvedMode();

  return (
    // Root layer: base tokens, no vertical's colour. Each module stack narrows
    // it, and a brand subtree narrows it again.
    <ThemeProvider module="neutral" mode={mode}>
      <AppContainer onLayout={onLayout} />
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  // The names here are what `fontFamily` resolves to app-wide — see `F` in
  // constants/theme.ts. Keep the two lists in step.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  const onReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // A font that fails to decode must not brick the app: fall through to the
  // system face rather than holding the splash forever.
  if (!fontsLoaded && !fontError) return null;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemedApp onLayout={onReady} />
      </PersistGate>
    </Provider>
  );
};

export default App;
