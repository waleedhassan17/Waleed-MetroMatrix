import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import AppContainer from './components/app-container/appContainer';
import { ThemeProvider, useResolvedMode } from './theme';

// Hold the native splash until the store has rehydrated, so the first frame
// is painted in the appearance the user chose rather than the default.
//
// It used to also wait on Inter and Sora. The app renders in the platform
// system face now (see `W` in constants/theme.ts), so there is nothing to
// decode and nothing to reflow — which is one blocking step off every cold
// start.
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
 * the rehydrated preference rather than the initial 'light' that would be
 * replaced a frame later. A user who chose dark must not get a white flash on
 * every cold start, which is what this ordering avoids.
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
  // Nothing to wait for before the tree can paint — the only thing that held
  // the splash was the font load. `onReady` still fires from AppContainer's
  // first layout, so the native splash comes down when there is something
  // real behind it, not a frame earlier.
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemedApp onLayout={onReady} />
      </PersistGate>
    </Provider>
  );
};

export default App;
