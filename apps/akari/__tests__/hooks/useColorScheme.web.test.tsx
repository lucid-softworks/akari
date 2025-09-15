import * as React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import nativeUseColorScheme from 'react-native/Libraries/Utilities/useColorScheme';
import { useColorScheme } from '@/hooks/useColorScheme.web';

type ColorScheme = ReturnType<typeof useColorScheme>;

const mockUseNativeColorScheme = nativeUseColorScheme as jest.Mock;

function TestComponent({ onRender }: { onRender: (value: ColorScheme) => void }) {
  const scheme = useColorScheme();
  onRender(scheme);
  return null;
}

describe('useColorScheme (web)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns light before hydration when effects have not run', () => {
    mockUseNativeColorScheme.mockReturnValue('dark');

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    expect(renders[0]).toBe('light');
  });

  it('returns the native color scheme after hydration', async () => {
    mockUseNativeColorScheme.mockReturnValue('dark');

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    await waitFor(() => {
      expect(renders[renders.length - 1]).toBe('dark');
    });
  });

  it('passes through null from the native hook once hydrated', async () => {
    mockUseNativeColorScheme.mockReturnValue(null);

    const renders: ColorScheme[] = [];

    render(<TestComponent onRender={(value) => renders.push(value)} />);

    await waitFor(() => {
      expect(renders[renders.length - 1]).toBeNull();
    });
  });
});
