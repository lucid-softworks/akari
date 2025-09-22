import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useResponsive } from '@/hooks/useResponsive';

jest.mock('@/hooks/useResponsive');
jest.mock('@/components/Sidebar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Sidebar: () => <View testID="sidebar" /> };
});
jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});
jest.mock('@/components/MobileBottomNav', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { MobileBottomNav: () => <View testID="mobile-nav" /> };
});

const mockUseResponsive = useResponsive as jest.Mock;

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sidebar on large screens', () => {
    mockUseResponsive.mockReturnValue({ isLargeScreen: true });
    const { getByTestId, getByText, queryByTestId } = render(
      <ResponsiveLayout>
        <Text>Child</Text>
      </ResponsiveLayout>,
    );
    expect(getByTestId('sidebar')).toBeTruthy();
    expect(getByText('Child')).toBeTruthy();
    expect(queryByTestId('mobile-nav')).toBeNull();
  });

  it('renders mobile navigation on small screens', () => {
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    const { queryByTestId, getByText } = render(
      <ResponsiveLayout>
        <Text>Child</Text>
      </ResponsiveLayout>,
    );
    expect(getByText('Child')).toBeTruthy();
    expect(queryByTestId('sidebar')).toBeNull();
    expect(queryByTestId('mobile-nav')).toBeTruthy();
  });
});
