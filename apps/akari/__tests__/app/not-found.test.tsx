import { render } from '@testing-library/react-native';

import NotFoundScreen from '@/app/+not-found';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <Text accessibilityRole="link" href={href}>
        {children}
      </Text>
    ),
    Stack: {
      Screen: jest.fn(() => null),
    },
    usePathname: jest.fn(() => '/unknown'),
  };
});

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockImplementation((colors: { light?: string }) => colors.light ?? '#fff');
});

describe('NotFoundScreen', () => {
  it('renders error message and link to home screen', () => {
    const { getByText, getByRole } = render(<NotFoundScreen />);

    expect(getByText('This screen does not exist.')).toBeTruthy();

    const link = getByRole('link', { name: 'Go to home screen!' });
    expect(link.props.href).toBe('/index');
  });

  it('sets stack screen title', () => {
    render(<NotFoundScreen />);

    const { Screen } = require('expo-router').Stack;
    expect(Screen).toHaveBeenCalled();
    expect(Screen.mock.calls[0][0]).toEqual(
      expect.objectContaining({ options: { title: 'Oops!' } }),
    );
  });
});
