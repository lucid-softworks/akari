import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ThemedView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors) => colors.light ?? '#fff');
  });

  it('renders with default colors', () => {
    const { getByTestId } = render(<ThemedView testID="view" />);
    const style = StyleSheet.flatten(getByTestId('view').props.style);
    expect(style.backgroundColor).toBe('#fff');
    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: undefined, dark: undefined },
      'background',
    );
  });

  it('applies custom colors when provided', () => {
    render(
      <ThemedView lightColor="#aaa" darkColor="#000" />,
    );
    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: '#aaa', dark: '#000' },
      'background',
    );
  });

  it('merges additional styles', () => {
    const { getByTestId } = render(
      <ThemedView testID="view" style={{ margin: 10 }} />,
    );
    const style = StyleSheet.flatten(getByTestId('view').props.style);
    expect(style.margin).toBe(10);
  });
});
