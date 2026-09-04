import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import AppContainer from './components/app-container/appContainer';

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
        <AppContainer onLayout={onReady} />
      </PersistGate>
    </Provider>
  );
};

export default App;
