import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TabBadge } from '@/components/TabBadge';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('TabBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('returns null when count is zero', () => {
    const { toJSON } = render(<TabBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it('displays the count when greater than zero', () => {
    const { getByText } = render(<TabBadge count={5} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('shows "99+" when count exceeds 99', () => {
    const { getByText } = render(<TabBadge count={150} />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('applies small badge styles when size is small', () => {
    const { toJSON } = render(<TabBadge count={1} size="small" />);
    const view = toJSON() as any;
    const style = StyleSheet.flatten(view.props.style);
    expect(style.height).toBe(16);
  });

  it('applies medium badge styles by default', () => {
    const { toJSON } = render(<TabBadge count={1} />);
    const view = toJSON() as any;
    const style = StyleSheet.flatten(view.props.style);
    expect(style.height).toBe(20);
  });

  it('calls useThemeColor for background and text colors', () => {
    render(<TabBadge count={1} />);
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      1,
      { light: '#ff3b30', dark: '#ff453a' },
      'tint',
    );
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      2,
      { light: '#ffffff', dark: '#ffffff' },
      'text',
    );
  });
});
