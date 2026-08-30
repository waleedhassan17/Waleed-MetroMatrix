import { registerRootComponent } from 'expo';

import App from './App';
// Registered HERE, at the true entry point, before anything else runs.
//
// Notifee requires onBackgroundEvent to be registered outside the React tree:
// an action pressed on a lock-screen call notification may arrive in a process
// that has no React tree yet, and a handler registered inside a component
// would never have run. Nothing registered it at all, so Decline on a locked
// device did nothing — and since that notification is `ongoing`, it could not
// be swiped away either.
import { registerCallBackgroundHandler } from './services/call/callBackgroundHandler';

registerCallBackgroundHandler();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
