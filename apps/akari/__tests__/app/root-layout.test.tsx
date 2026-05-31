import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '@/app/_layout';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Platform } from 'react-native';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    ThemeProvider: jest.fn(
      ({ children }: { value: unknown; children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
    ),
  };
});

jest.mock('expo-font');
const mockUseFonts = useFonts as unknown as jest.Mock;

jest.mock('@/hooks/useColorScheme');
const mockUseColorScheme = useColorScheme as unknown as jest.Mock;

jest.mock('react-native-gesture-handler', () => {
  return { GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

jest.mock('@tanstack/react-query-devtools', () => {
  const { Text } = require('react-native');
  return { ReactQueryDevtools: () => <Text>Devtools</Text> };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  const EdgeInsetsContext = React.createContext({ top: 0, right: 0, bottom: 0, left: 0 });
  const FrameContext = React.createContext({ x: 0, y: 0, width: 0, height: 0 });

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SafeAreaInsetsContext: EdgeInsetsContext,
    SafeAreaFrameContext: FrameContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    initialWindowMetrics: null,
  };
});

jest.mock('@/contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Leaf chrome rendered inside the provider tree. None are relevant to what
// this layout test asserts (font gate, theme, stack screens, web devtools),
// and several reach for native modules (netinfo, OAuth storage) that aren't
// wired up under jest — stub them to inert nodes.
jest.mock('@/components/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('@/components/OAuthAccountBinder', () => ({ OAuthAccountBinder: () => null }));
jest.mock('@/components/DevServerBanner', () => ({ DevServerBanner: () => null }));
jest.mock('@/components/ExternalLinkConfirmHost', () => ({ ExternalLinkConfirmHost: () => null }));

jest.mock('@/utils/secureStorageBootstrap', () => ({
  bootstrapSecureStorage: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/secureStorage', () => ({
  REACT_QUERY_CACHE_STORAGE_KEY: 'reactQueryCache',
  storage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('expo-router', () => {
  const Screen = jest.fn(() => null);
  const Stack = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  // @ts-ignore
  Stack.Screen = Screen;
  return {
    Stack,
    // PlausibleAutoPageview (rendered inside the provider tree) reads the
    // current route via these hooks; stub them so the layout renders.
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
  };
});

// The analytics provider hooks into router state and fires network pageviews;
// stub it to a passthrough provider + no-op auto-pageview so the layout under
// test doesn't pull in the real Plausible wiring.
jest.mock('@/utils/plausible', () => ({
  PlausibleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PlausibleAutoPageview: () => null,
}));

const setPlatform = (os: string) => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });
};

const mockThemeProvider = ThemeProvider as unknown as jest.Mock;

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    setPlatform('ios');
    mockThemeProvider.mockClear();
  });

  it('returns null when fonts are not loaded', () => {
    mockUseFonts.mockReturnValue([false]);
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
  });

  it('renders stack screens without devtools on native platforms', async () => {
    mockUseFonts.mockReturnValue([true]);
    const { queryByText } = render(<RootLayout />);

    await waitFor(() => {
      expect(mockThemeProvider).toHaveBeenCalled();
    });

    expect(queryByText('Devtools')).toBeNull();
    const { Stack } = require('expo-router');
    await waitFor(() => {
      expect(Stack.Screen).toHaveBeenCalledTimes(8);
    });
    const names: string[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
    }
    expect(names).toEqual([
      '(auth)',
      '(tabs)',
      'debug',
      'oauth/callback',
      'oauth/mastodon',
      'onboarding/mastodon',
      'onboarding/mastodon-follow',
      '+not-found',
    ]);
    const themeProps = mockThemeProvider.mock.calls[0][0];
    expect(themeProps.value).toBe(DefaultTheme);
  });

  it('renders devtools on web', async () => {
    mockUseFonts.mockReturnValue([true]);
    setPlatform('web');
    const { findByText } = render(<RootLayout />);
    expect(await findByText('Devtools')).toBeTruthy();
  });

  it('uses the dark theme when the color scheme is dark', async () => {
    mockUseFonts.mockReturnValue([true]);
    mockUseColorScheme.mockReturnValue('dark');

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockThemeProvider).toHaveBeenCalled();
    });
    const themeProps = mockThemeProvider.mock.calls[0][0];
    expect(themeProps.value).toBe(DarkTheme);
  });
});

