// Early setup file to mock Platform after jest-expo setup
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
}));

// react-native-worklets 0.8 (paired with reanimated 4.3 in SDK 56) checks
// `global.__workletsModuleProxy` at import time and throws when the native
// TurboModule is missing. Jest has no native runtime, so prime the proxy with
// a stub before reanimated's mock chain loads.
if (typeof global.__workletsModuleProxy === 'undefined') {
  const noop = () => ({});
  global.__workletsModuleProxy = new Proxy({}, { get: () => noop });
}

// Mock expo-modules-core Platform
jest.mock('expo-modules-core/src/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

// Navigation utilities are mocked in __mocks__ directory
