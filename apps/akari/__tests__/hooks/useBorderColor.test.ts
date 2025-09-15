import { renderHook } from '@testing-library/react-native';

import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: jest.fn(),
}));

const mockUseThemeColor = useThemeColor as jest.Mock;

describe('useBorderColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the value from useThemeColor', () => {
    mockUseThemeColor.mockReturnValue('border-value');

    const { result } = renderHook(() => useBorderColor());

    expect(result.current).toBe('border-value');
  });

  it('delegates to useThemeColor with the border palette', () => {
    mockUseThemeColor.mockReturnValue('border-value');

    renderHook(() => useBorderColor());

    expect(mockUseThemeColor).toHaveBeenCalledWith(
      {
        light: '#e8eaed',
        dark: '#2d3133',
      },
      'background',
    );
  });
});
