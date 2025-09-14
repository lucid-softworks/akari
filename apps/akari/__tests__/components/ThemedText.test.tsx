import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ThemedText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors) => colors.light ?? '#fff');
  });

  it('renders with default style', () => {
    const { getByText } = render(<ThemedText>Test</ThemedText>);
    const text = getByText('Test');
    const style = StyleSheet.flatten(text.props.style);
    expect(style.color).toBe('#fff');
    expect(style.fontSize).toBe(16);
    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: undefined, dark: undefined },
      'text',
    );
  });

  it('applies custom colors when provided', () => {
    render(
      <ThemedText lightColor="#aaa" darkColor="#000">
        Colored
      </ThemedText>,
    );
    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: '#aaa', dark: '#000' },
      'text',
    );
  });

  it.each([
    ['default', { fontSize: 16, lineHeight: 24 }],
    ['title', { fontSize: 32, lineHeight: 32, fontWeight: 'bold' }],
    ['defaultSemiBold', { fontSize: 16, lineHeight: 24, fontWeight: '600' }],
    ['subtitle', { fontSize: 20, fontWeight: 'bold' }],
    ['link', { fontSize: 16, lineHeight: 30, color: '#0a7ea4' }],
  ] as const)("applies '%s' type style", (type, expected) => {
    const { getByText } = render(<ThemedText type={type}>Sample</ThemedText>);
    const style = StyleSheet.flatten(getByText('Sample').props.style);
    expect(style).toMatchObject(expected);
  });

  it('merges additional styles', () => {
    const { getByText } = render(
      <ThemedText style={{ margin: 10 }}>Margin</ThemedText>,
    );
    const style = StyleSheet.flatten(getByText('Margin').props.style);
    expect(style.margin).toBe(10);
  });
});
