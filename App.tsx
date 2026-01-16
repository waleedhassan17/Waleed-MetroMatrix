import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import AppContainer from './components/app-container/appContainer';

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

  return (
    <Provider store={store}>
      <AppContainer />
    </Provider>
  );
};

export default App;