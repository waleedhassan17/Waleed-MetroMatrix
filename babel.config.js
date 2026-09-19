// ============================================================================
// Babel config.
//
// This file did not exist before: Expo SDK 54 supplies `babel-preset-expo` by
// convention, and that default is reproduced verbatim below. Declaring the
// preset explicitly changes nothing on its own — in particular
// `babel-preset-expo` still auto-adds `react-native-worklets/plugin` when the
// package is installed (it is, for Reanimated 4), so Reanimated keeps working
// without listing that plugin here. Listing it here as well would register it
// twice.
//
// WHY IT EXISTS: to strip `console.*` from release builds.
//
// The app carries ~880 `console.log` calls, a good share of them on the auth
// path — token lifecycle, password type/length, OTP progress. React Native does
// NOT remove them in a release build: they keep running on real user devices,
// where anyone with `adb logcat` (Android) or Console.app (iOS) can read them
// off a phone they hold. They also cost real time, because every argument is
// still serialised even though nothing is listening.
//
// `error` and `warn` are kept on purpose — they are the channel crash and error
// reporting reads, and silencing them would hide real production failures.
//
// This is build-time only: `__DEV__` builds (`npm start`, dev client) keep every
// log, so day-to-day debugging is unchanged. `env.production` keys off
// BABEL_ENV/NODE_ENV, which EAS sets to `production` for release profiles.
// ============================================================================

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
      },
    },
  };
};
