import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import AppContainer from './components/app-container/appContainer';
import { configureGoogleSignIn } from './networks/authcalls/googleSignInConfig';
import { Platform } from 'react-native';

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
  // Note: If you have notification management, initialize it here
  // Example: useNotificationManager();
  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      configureGoogleSignIn();
      console.log('✅ Google Sign-In configured for native platform');
    } else {
      console.log('ℹ️ Web platform - Google Sign-In will use expo-auth-session');
    }
  }, []);
  return (
    <Provider store={store}>
      <AppContainer />
    </Provider>
  );
};

export default App;