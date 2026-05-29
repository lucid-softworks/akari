import * as React from 'react';
import { act, render } from '@testing-library/react-native';

import { useColorScheme } from '@/hooks/useColorScheme.web';

type ColorScheme = ReturnType<typeof useColorScheme>;

type ChangeListener = () => void;

/**
 * The web color-scheme hook reads `window.matchMedia('(prefers-color-scheme:
 * dark)')` via `useSyncExternalStore`. These tests stub `matchMedia` so we can
 * drive the snapshot (`matches`) and fire `change` events to assert the hook
 * stays subscribed.
 */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<ChangeListener>();
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_event: string, cb: ChangeListener) => listeners.add(cb),
    removeEventListener: (_event: string, cb: ChangeListener) => listeners.delete(cb),
  };
  const matchMedia = jest.fn(() => mql);
  // @ts-expect-error -- jsdom-less RN test env lacks matchMedia; we install it.
  window.matchMedia = matchMedia;
  return {
    setMatches(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

function TestComponent({ onRender }: { onRender: (value: ColorScheme) => void }) {
  const scheme = useColorScheme();
  onRender(scheme);
  return null;
}

describe('useColorScheme (web)', () => {
  afterEach(() => {
    // @ts-expect-error -- clean up the stub we installed on the shared window.
    delete window.matchMedia;
    jest.clearAllMocks();
  });

  it('returns light when matchMedia is unavailable (server snapshot)', () => {
    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    expect(renders[renders.length - 1]).toBe('light');
  });

  it('returns dark when the prefers-color-scheme query matches', () => {
    stubMatchMedia(true);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    expect(renders[renders.length - 1]).toBe('dark');
  });

  it('returns light when the prefers-color-scheme query does not match', () => {
    stubMatchMedia(false);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    expect(renders[renders.length - 1]).toBe('light');
  });

  it('updates when the media query change event fires', () => {
    const controls = stubMatchMedia(false);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    expect(renders[renders.length - 1]).toBe('light');

    act(() => {
      controls.setMatches(true);
    });

    expect(renders[renders.length - 1]).toBe('dark');
  });
});
