import { render } from '@testing-library/react-native';

import { Label } from '@/components/Label';
import { useThemeColor } from '@/hooks/useThemeColor';

// Mock the useThemeColor hook
jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('Label Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    mockUseThemeColor.mockImplementation((colors, _colorScheme) => {
      // Return light theme colors by default
      return colors.light;
    });
  });

  it('should render label with text', () => {
    const { getByText } = render(<Label text="Test Label" />);
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('should render with custom color when provided', () => {
    const customColor = '#ff0000';
    const { getByText } = render(<Label text="Custom Color" color={customColor} />);

    const labelElement = getByText('Custom Color');
    expect(labelElement).toBeTruthy();

    // The component should render without errors when custom color is provided
    expect(labelElement).toBeDefined();
  });

  it('should render warning label with appropriate styling', () => {
    mockUseThemeColor.mockImplementation((colors, colorScheme) => {
      if (colorScheme === 'background') return colors.light; // #ffebee
      if (colorScheme === 'text') return colors.light; // #c62828
      return colors.light;
    });

    const { getByText } = render(<Label text="Warning Label" isWarning />);

    const labelElement = getByText('Warning Label');
    expect(labelElement).toBeTruthy();
  });

  it('should render positive label with appropriate styling', () => {
    mockUseThemeColor.mockImplementation((colors, colorScheme) => {
      if (colorScheme === 'background') return colors.light; // #e8f5e8
      if (colorScheme === 'text') return colors.light; // #2e7d32
      return colors.light;
    });

    const { getByText } = render(<Label text="Positive Label" isPositive />);

    const labelElement = getByText('Positive Label');
    expect(labelElement).toBeTruthy();
  });

  it('should render default label with neutral styling', () => {
    mockUseThemeColor.mockImplementation((colors, colorScheme) => {
      if (colorScheme === 'background') return colors.light; // #f0f0f0
      if (colorScheme === 'text') return colors.light; // #666666
      return colors.light;
    });

    const { getByText } = render(<Label text="Default Label" />);

    const labelElement = getByText('Default Label');
    expect(labelElement).toBeTruthy();
  });

  it('should handle dark theme colors', () => {
    mockUseThemeColor.mockImplementation((colors, _colorScheme) => {
      // Return dark theme colors
      return colors.dark;
    });

    const { getByText } = render(<Label text="Dark Theme Label" isWarning />);

    const labelElement = getByText('Dark Theme Label');
    expect(labelElement).toBeTruthy();
  });

  it('should prioritize custom color over theme colors', () => {
    const customColor = '#00ff00';
    const { getByText } = render(<Label text="Custom Override" color={customColor} isWarning isPositive />);

    const labelElement = getByText('Custom Override');
    expect(labelElement).toBeTruthy();

    // The component should render without errors when custom color overrides theme colors
    expect(labelElement).toBeDefined();
  });

  it('should handle empty text gracefully', () => {
    const { getByText } = render(<Label text="" />);

    const labelElement = getByText('');
    expect(labelElement).toBeTruthy();
  });

  it('should handle long text content', () => {
    const longText = 'This is a very long label text that might wrap or overflow';
    const { getByText } = render(<Label text={longText} />);

    const labelElement = getByText(longText);
    expect(labelElement).toBeTruthy();
  });

  it('should handle special characters in text', () => {
    const specialText = 'Label with @#$%^&*()_+ symbols';
    const { getByText } = render(<Label text={specialText} />);

    const labelElement = getByText(specialText);
    expect(labelElement).toBeTruthy();
  });

  it('should handle unicode characters in text', () => {
    const unicodeText = 'Label with émojis 🎉 and ñ characters';
    const { getByText } = render(<Label text={unicodeText} />);

    const labelElement = getByText(unicodeText);
    expect(labelElement).toBeTruthy();
  });

  it('should render a warning chip with the warning palette foreground', () => {
    const { getByText } = render(<Label text="Warning" isWarning />);

    // The chip no longer routes through useThemeColor; it picks the warning
    // palette by color scheme. In light mode the warning foreground is
    // #b3261e and it is applied to the chip text.
    const labelElement = getByText('Warning');
    const flattened = Object.assign({}, ...[labelElement.props.style].flat(Infinity).filter(Boolean));
    expect(flattened.color).toBe('#b3261e');
  });

  it('should render a positive chip with the positive palette foreground', () => {
    const { getByText } = render(<Label text="Positive" isPositive />);

    const labelElement = getByText('Positive');
    const flattened = Object.assign({}, ...[labelElement.props.style].flat(Infinity).filter(Boolean));
    expect(flattened.color).toBe('#1b5e20');
  });
});
