import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import TabBarBackground, { useBottomTabOverflow } from '@/components/ui/TabBarBackground.tsx';

jest.mock('@/hooks/useBorderColor', () => ({
  useBorderColor: jest.fn(() => '#111'),
}));

jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: jest.fn((palette) => palette.light ?? palette.dark ?? '#fff'),
}));

describe('TabBarBackground', () => {
  it('renders a themed background surface with a border', () => {
    const { getByTestId } = render(<TabBarBackground />);
    const background = getByTestId('tab-bar-background');
    const style = StyleSheet.flatten(background.props.style);

    expect(style).toMatchObject({
      position: 'absolute',
      borderTopWidth: expect.any(Number),
      borderColor: '#111',
      backgroundColor: 'rgba(249, 250, 251, 0.94)',
    });
  });

  it('useBottomTabOverflow returns 0', () => {
    expect(useBottomTabOverflow()).toBe(0);
  });
});
