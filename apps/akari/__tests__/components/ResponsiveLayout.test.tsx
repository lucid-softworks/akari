import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useResponsive');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/components/Sidebar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Sidebar: () => <View testID="sidebar" /> };
});
jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

const mockUseResponsive = useResponsive as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#fff');
  });

  it('renders sidebar on large screens', () => {
    mockUseResponsive.mockReturnValue({ isLargeScreen: true });
    const { getByTestId, getByText } = render(
      <ResponsiveLayout>
        <Text>Child</Text>
      </ResponsiveLayout>,
    );
    expect(getByTestId('sidebar')).toBeTruthy();
    expect(getByText('Child')).toBeTruthy();
  });

  it('renders children only on small screens', () => {
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    const { queryByTestId, getByText } = render(
      <ResponsiveLayout>
        <Text>Child</Text>
      </ResponsiveLayout>,
    );
    expect(getByText('Child')).toBeTruthy();
    expect(queryByTestId('sidebar')).toBeNull();
  });
});
