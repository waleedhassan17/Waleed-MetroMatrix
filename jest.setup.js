// Jest setup: native modules that have no JS implementation in tests.
// AsyncStorage ships an official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
