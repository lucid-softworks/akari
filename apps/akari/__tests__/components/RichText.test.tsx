import { render } from '@testing-library/react-native';

import { RichText } from '@/components/RichText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tokenize } from '@atcute/bluesky-richtext-parser';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Link: ({ children, ...props }: { children: React.ReactNode }) => (
      <Text accessibilityRole="link" {...props}>
        {children}
      </Text>
    ),
  };
});

jest.mock('@atcute/bluesky-richtext-parser', () => ({
  tokenize: jest.fn(),
}));

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockTokenize = tokenize as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#00f');
});

describe('RichText', () => {
  it('trims whitespace and renders text', () => {
    mockTokenize.mockReturnValue([{ type: 'text', text: 'Hello', raw: 'Hello' }]);
    const { getByText } = render(<RichText text="  Hello  " />);
    expect(mockTokenize).toHaveBeenCalledWith('Hello');
    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders link tokens with provided text', () => {
    mockTokenize.mockReturnValue([
      {
        type: 'link',
        text: 'Example',
        url: 'https://example.com',
        raw: '[Example](https://example.com)',
      },
    ]);
    const { getByRole } = render(
      <RichText text="visit [Example](https://example.com)" />,
    );
    expect(getByRole('link', { name: 'Example' })).toBeTruthy();
  });

  it('renders autolink tokens with shortened URL', () => {
    const longUrl = 'https://www.example.com/this/is/a/really/long/path';
    mockTokenize.mockReturnValue([
      { type: 'autolink', url: longUrl, raw: longUrl },
    ]);
    const shortUrl = 'example.com/this/is/a/real\u2026';
    const { getByRole } = render(<RichText text={`link ${longUrl}`} />);
    expect(getByRole('link', { name: shortUrl })).toBeTruthy();
  });

  it('renders mention tokens', () => {
    mockTokenize.mockReturnValue([
      { type: 'mention', handle: 'alice.bsky.social', raw: '@alice.bsky.social' },
    ]);
    const { getByRole } = render(<RichText text="Hello @alice.bsky.social" />);
    expect(getByRole('link', { name: '@alice.bsky.social' })).toBeTruthy();
  });

  it('renders unknown tokens as plain text', () => {
    mockTokenize.mockReturnValue([
      { type: 'text', text: 'Hello ', raw: 'Hello ' },
      { type: 'topic', raw: '#tag', name: 'tag' },
    ]);
    const { getByText } = render(<RichText text="Hello #tag" />);
    expect(getByText(/#tag/)).toBeTruthy();
  });

  it('uses theme colors for link and mention', () => {
    mockTokenize.mockReturnValue([
      { type: 'mention', handle: 'user', raw: '@user' },
      { type: 'autolink', url: 'https://example.com', raw: 'https://example.com' },
    ]);
    render(<RichText text="@user https://example.com" />);
    const tintPaletteCalls = mockUseThemeColor.mock.calls.filter(([palette, key]) => {
      return (
        key === 'tint' &&
        palette &&
        typeof palette === 'object' &&
        'light' in palette &&
        (palette as any).light === '#007AFF' &&
        (palette as any).dark === '#0A84FF'
      );
    });
    expect(tintPaletteCalls.length).toBeGreaterThanOrEqual(2);
  });
});
