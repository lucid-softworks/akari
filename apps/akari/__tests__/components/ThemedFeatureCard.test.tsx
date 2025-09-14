import { render } from '@testing-library/react-native';

import { ThemedFeatureCard } from '@/components/ThemedFeatureCard';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ThemedFeatureCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default colors and styles', () => {
    mockUseThemeColor.mockReturnValue('#ffffff');

    const { getByTestId } = render(
      <ThemedFeatureCard accessibilityRole="header" testID="card" />,
    );

    const card = getByTestId('card');
    expect(card).toBeTruthy();
    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: '#f8f9fa', dark: '#2a2d2e' },
      'background',
    );
  });

  it('uses provided colors and merges custom style', () => {
    mockUseThemeColor.mockReturnValue('#123456');

    const { getByTestId } = render(
      <ThemedFeatureCard
        accessibilityRole="header"
        lightColor="#aaa"
        darkColor="#bbb"
        style={{ padding: 8 }}
        testID="card"
      />,
    );

    const card = getByTestId('card');
    const styles = Array.isArray(card.props.style)
      ? card.props.style
      : [card.props.style];

    expect(styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#123456' }),
        expect.objectContaining({ padding: 8 }),
      ]),
    );
    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: '#aaa', dark: '#bbb' },
      'background',
    );
  });
});

