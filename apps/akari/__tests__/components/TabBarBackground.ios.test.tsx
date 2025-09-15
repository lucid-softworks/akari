import { render, renderHook } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TabBarBackground, { useBottomTabOverflow } from '@/components/ui/TabBarBackground.ios';
import { BlurView } from 'expo-blur';

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: jest.fn(),
}));

const mockUseBottomTabBarHeight = require('@react-navigation/bottom-tabs').useBottomTabBarHeight as jest.Mock;

describe('TabBarBackground (iOS)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders BlurView with expected props', () => {
    const { UNSAFE_getByType } = render(<TabBarBackground />);
    const blurView = UNSAFE_getByType(BlurView);

    expect(blurView.props.tint).toBe('systemChromeMaterial');
    expect(blurView.props.intensity).toBe(100);
    expect(blurView.props.style).toMatchObject(StyleSheet.absoluteFill);
  });

  it('useBottomTabOverflow returns tab bar height', () => {
    mockUseBottomTabBarHeight.mockReturnValue(24);
    const { result } = renderHook(() => useBottomTabOverflow());
    expect(result.current).toBe(24);
  });
});
