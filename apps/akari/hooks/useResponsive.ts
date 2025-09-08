import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;
  const isLargeScreen = width >= BREAKPOINTS.mobile;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    breakpoints: BREAKPOINTS,
  };
}
