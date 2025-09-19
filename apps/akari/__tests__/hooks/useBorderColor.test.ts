import { renderHook } from '@testing-library/react-native';

import { useBorderColor } from '@/hooks/useBorderColor';
import { useAppTheme } from '@/theme';

jest.mock('@/theme', () => ({
  useAppTheme: jest.fn(),
}));

const mockUseAppTheme = useAppTheme as jest.Mock;

describe('useBorderColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppTheme.mockReturnValue({
      colors: {
        border: '#e5e7eb',
        borderMuted: '#d1d5db',
      },
    });
  });

  it('returns the default border color', () => {
    const { result } = renderHook(() => useBorderColor());

    expect(result.current).toBe('#e5e7eb');
  });

  it('returns the muted border color when requested', () => {
    const { result } = renderHook(() => useBorderColor('muted'));

    expect(result.current).toBe('#d1d5db');
  });
});
