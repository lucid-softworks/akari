import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import nativeUseColorScheme from 'react-native/Libraries/Utilities/useColorScheme';
import { useColorScheme } from '@/hooks/useColorScheme.web';

type ColorScheme = ReturnType<typeof useColorScheme>;

const mockUseNativeColorScheme = nativeUseColorScheme as jest.Mock;

type MatchMediaController = {
  dispatchChange: (matches: boolean) => void;
};

function createMatchMedia(matches: boolean): MatchMediaController {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const query = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: jest.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeListener: jest.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
    addEventListener: jest.fn((_, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: jest.fn((_, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
    dispatchEvent: jest.fn(),
  } as unknown as MediaQueryList;

  const dispatchChange = (nextMatches: boolean) => {
    (query as unknown as { matches: boolean }).matches = nextMatches;
    const event = { matches: nextMatches } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  };

  (window as unknown as { matchMedia: (query: string) => MediaQueryList }).matchMedia = jest
    .fn(() => query)
    .mockName('matchMedia');

  return { dispatchChange: (nextMatches: boolean) => act(() => dispatchChange(nextMatches)) };
}

function TestComponent({ onRender }: { onRender: (value: ColorScheme) => void }) {
  const scheme = useColorScheme();
  onRender(scheme);
  return null;
}

describe('useColorScheme (web)', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
    jest.clearAllMocks();
  });

  it('returns light before hydration when effects have not run', () => {
    mockUseNativeColorScheme.mockReturnValue('dark');
    createMatchMedia(true);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    expect(renders[0]).toBe('light');
  });

  it('syncs with the browser color scheme after hydration', async () => {
    mockUseNativeColorScheme.mockReturnValue('light');
    createMatchMedia(true);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    await waitFor(() => {
      expect(renders[renders.length - 1]).toBe('dark');
    });
  });

  it('updates when the browser color scheme changes', async () => {
    mockUseNativeColorScheme.mockReturnValue('light');
    const controller = createMatchMedia(false);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    await waitFor(() => {
      expect(renders[renders.length - 1]).toBe('light');
    });

    controller.dispatchChange(true);

    await waitFor(() => {
      expect(renders[renders.length - 1]).toBe('dark');
    });
  });

  it('falls back to the native hook when matchMedia is unavailable', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });

    mockUseNativeColorScheme.mockReturnValue('dark');

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    await waitFor(() => {
      expect(renders[renders.length - 1]).toBe('dark');
    });
  });
});
