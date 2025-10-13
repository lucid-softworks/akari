jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedModule');

// Global mock for expo-router usePathname
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  usePathname: jest.fn(() => '/index'),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

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

const { act } = require('@testing-library/react-native');
const { useToast } = require('@/contexts/ToastContext');

beforeEach(() => {
  mockToastContext.showToast = jest.fn();
  mockToastContext.hideToast = jest.fn();
  useToast.mockReturnValue(mockToastContext);
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
