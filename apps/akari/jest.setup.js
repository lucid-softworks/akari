jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedModule');

// Global mock for expo-router usePathname
jest.mock('expo-router', () => ({
  usePathname: jest.fn(() => '/index'),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

// Navigation utilities are mocked in jest.setup.early.js

jest.mock(
  '@shopify/flash-list',
  () => {
    const React = require('react');
    const { FlatList } = require('react-native');

    const FlashList = React.forwardRef((props, ref) => <FlatList ref={ref} {...props} />);
    FlashList.displayName = 'FlashList';

    return { FlashList };
  },
  { virtual: true },
);

const mockToastContext = {
  showToast: jest.fn(),
  hideToast: jest.fn(),
};

jest.mock('@/contexts/ToastContext', () => ({
  __esModule: true,
  ToastProvider: ({ children }) => children,
  useToast: jest.fn(() => mockToastContext),
}));

// Mock LanguageProvider for tests
jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  LanguageProvider: ({ children }) => children,
  useLanguage: jest.fn(() => ({
    currentLocale: 'en',
    changeLanguage: jest.fn(),
    availableLocales: ['en', 'es', 'fr'],
  })),
}));

// Mock useTranslation hook for tests
jest.mock('@/hooks/useTranslation', () => ({
  __esModule: true,
  useTranslation: jest.fn(() => ({
    t: jest.fn((key, options) => {
      // Handle specific translation keys for testing
      if (key === 'ui.likes' && options && options.count) {
        return `${options.count} likes`;
      }
      if (key === 'ui.byCreator' && options && options.handle) {
        return `by @${options.handle}`;
      }
      // Return the key as the translation for testing
      if (options && typeof options === 'object') {
        return key.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
          return options[placeholder] || match;
        });
      }
      return key;
    }),
  })),
}));

const { act } = require('@testing-library/react-native');
const { useToast } = require('@/contexts/ToastContext');

beforeEach(() => {
  mockToastContext.showToast = jest.fn();
  mockToastContext.hideToast = jest.fn();
  useToast.mockReturnValue(mockToastContext);

  // Navigation mocks are set up in jest.setup.early.js

  jest.useFakeTimers();
});

afterEach(() => {
  if (jest.isMockFunction(setTimeout)) {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  }
});
