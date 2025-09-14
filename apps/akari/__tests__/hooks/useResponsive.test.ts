import { renderHook } from '@testing-library/react-native';
import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const { BREAKPOINTS, useResponsive } = require('@/hooks/useResponsive');

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

describe('useResponsive', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns mobile layout values', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 500, height: 800 });
    const { result } = renderHook(() => useResponsive());

    expect(result.current).toMatchObject({
      width: 500,
      height: 800,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeScreen: false,
      breakpoints: BREAKPOINTS,
    });
  });

  it('returns tablet layout values', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 800, height: 600 });
    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isLargeScreen).toBe(true);
  });

  it('returns desktop layout values', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 1200, height: 900 });
    const { result } = renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isLargeScreen).toBe(true);
  });
});
