import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ThemedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders with default colors', () => {
    const { getByTestId } = render(<ThemedCard testID="card" />);
    expect(getByTestId('card')).toBeTruthy();
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      1,
      { light: '#ffffff', dark: '#1a1d1e' },
      'background',
    );
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      2,
      { light: '#e8eaed', dark: '#2d3133' },
      'background',
    );
  });

  it('applies custom colors when provided', () => {
    render(
      <ThemedCard
        lightColor="#aaa"
        darkColor="#000"
        lightBorderColor="#bbb"
        darkBorderColor="#111"
      />,
    );
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      1,
      { light: '#aaa', dark: '#000' },
      'background',
    );
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      2,
      { light: '#bbb', dark: '#111' },
      'background',
    );
  });

  it('merges additional styles', () => {
    const { getByTestId } = render(
      <ThemedCard testID="card" style={{ margin: 10 }} />,
    );
    const card = getByTestId('card');
    const style = StyleSheet.flatten(card.props.style);
    expect(style.margin).toBe(10);
  });
});
