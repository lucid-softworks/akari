// In-memory MMKV stand-in so tests that don't explicitly mock secureStorage
// can still read/write through the real `storage` object. Tests that assert
// against MMKV directly can override this with their own jest.mock.
jest.mock('react-native-mmkv', () => {
  const stores = new Map();
  return {
    MMKV: jest.fn(({ id } = {}) => {
      const storeKey = id ?? 'default';
      if (!stores.has(storeKey)) stores.set(storeKey, new Map());
      const store = stores.get(storeKey);
      return {
        getString: (key) => store.get(key),
        set: (key, value) => store.set(key, value),
        delete: (key) => store.delete(key),
        contains: (key) => store.has(key),
        getAllKeys: () => [...store.keys()],
        recrypt: jest.fn(),
      };
    }),
  };
});

// secureStorage now lazy-inits via bootstrapSecureStorage(); kick that off
// here so hooks reading storage in `initialData` don't throw in tests.
const { initialiseSecureStorage } = require('./utils/secureStorage');
initialiseSecureStorage('jest-test-key');

// PDS resolution fires a real fetch to plc.directory / bsky.social. Hooks
// like usePdsUrl mount incidentally deep in component trees (ProfileHeader,
// bookmarks, ...), so tests don't know to mock them; the request then 404s
// and logs *after* the test finishes ("Cannot log after tests are done"),
// besides being slow and flaky. Resolve to a fixed URL in tests; specs that
// care about PDS resolution can override these mocks.
jest.mock('@/bluesky-api', () => {
  const actual = jest.requireActual('@/bluesky-api');
  return {
    ...actual,
    getPdsUrlFromDid: jest.fn(async () => 'https://pds.test'),
    getPdsUrlFromHandle: jest.fn(async () => 'https://pds.test'),
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedModule');

// NetInfo's native side isn't available in jest; the OfflineBanner subscribes
// to it on mount and the mock-less version throws "Cannot read isInternetReachable".
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
    configure: jest.fn(),
  },
}));

// Sentry.wrap() is an HOC that adds touch + error boundary wrappers around
// the component, breaking tests that assert the wrapped component's exact
// output (e.g. a null render). Make wrap() identity in tests.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (Component) => Component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
}));

// Global mock for expo-router usePathname
jest.mock('expo-router', () => ({
  usePathname: jest.fn(() => '/index'),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  },
}));

// Navigation utilities are mocked in jest.setup.early.js

// react-native-webview's WebView constructor reaches into the native turbo
// module at import time — stub the public surface for jest.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );
  WebView.displayName = 'WebView';
  return { __esModule: true, default: WebView, WebView };
});

// expo-video patches NativeVideoModule.VideoPlayer.prototype at module-load
// time, which throws in jest because the native module is undefined. Mock the
// public surface so importers don't blow up.
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    useVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      replaceAsync: jest.fn(),
      release: jest.fn(),
      muted: false,
      playing: false,
      loop: false,
      currentTime: 0,
      duration: 0,
    })),
    VideoView: React.forwardRef((props, ref) => React.createElement(View, { ...props, ref })),
  };
});

// Auto-wrap `render` / `renderHook` in a QueryClientProvider so tests that
// don't construct their own client don't blow up at `useQuery`. Tests that
// already supply a `wrapper` option keep working — we nest theirs inside.
jest.mock('@testing-library/react-native', () => {
  const actual = jest.requireActual('@testing-library/react-native');
  const React = require('react');
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  // Components open sheets/modals through the DialogManager, so every render
  // needs a DialogProvider up the tree or useDialogManager() throws. Provide
  // it globally with the real provider; tests that wrap in their own
  // DialogProvider just nest harmlessly (their inner provider wins).
  const { DialogProvider } = require('@/contexts/DialogContext');

  const wrap = (fn) => (ui, options = {}) => {
    const userWrapper = options.wrapper;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const Wrapper = ({ children }) => {
      const inner = userWrapper
        ? React.createElement(userWrapper, null, children)
        : children;
      return React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(DialogProvider, null, inner),
      );
    };
    return fn(ui, { ...options, wrapper: Wrapper });
  };

  return {
    ...actual,
    render: wrap(actual.render),
    renderHook: wrap(actual.renderHook),
  };
});

// useSafeAreaInsets() throws when no provider is up; tests rarely wrap their
// renders, so stub the hook + context at the module level.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const EdgeInsetsContext = React.createContext({ top: 0, right: 0, bottom: 0, left: 0 });
  const FrameContext = React.createContext({ x: 0, y: 0, width: 0, height: 0 });
  return {
    __esModule: true,
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    SafeAreaInsetsContext: EdgeInsetsContext,
    SafeAreaFrameContext: FrameContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    initialWindowMetrics: null,
  };
});

jest.mock(
  '@shopify/flash-list',
  () => {
    const React = require('react');
    const { FlatList } = require('react-native');

    const FlashList = React.forwardRef((props, ref) => {
      // FlashList tolerates an absent `refreshing` prop; FlatList does not when
      // `onRefresh` is set, so default it here to keep the shim transparent.
      const merged = props.onRefresh && props.refreshing == null
        ? { ...props, refreshing: false }
        : props;
      return <FlatList ref={ref} {...merged} />;
    });
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
