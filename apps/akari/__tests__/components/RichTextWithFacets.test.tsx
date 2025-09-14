import { render } from '@testing-library/react-native';

import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { useThemeColor } from '@/hooks/useThemeColor';

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

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#00f');
});

describe('RichTextWithFacets', () => {
  const getByteRange = (full: string, substr: string) => {
    const encoder = new TextEncoder();
    const startChar = full.indexOf(substr);
    const start = encoder.encode(full.slice(0, startChar)).length;
    const end = start + encoder.encode(substr).length;
    return { start, end };
  };

  it('renders plain text when no facets are provided', () => {
    const { getByText } = render(<RichTextWithFacets text="Hello world" />);
    expect(getByText('Hello world')).toBeTruthy();
  });

  it('renders mention facets as links', () => {
    const text = 'Hello @alice.bsky.social';
    const { start, end } = getByteRange(text, '@alice.bsky.social');
    const facets = [
      {
        index: { byteStart: start, byteEnd: end },
        features: [
          { $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' },
        ],
      },
    ];
    const { getByRole } = render(
      <RichTextWithFacets text={text} facets={facets} />,
    );
    expect(getByRole('link', { name: '@alice.bsky.social' })).toBeTruthy();
  });

  it('renders link facets with shortened URL when text is empty', () => {
    const text = 'Hello world';
    const longUrl = 'https://example.com/this/is/a/really/long/path';
    const facets = [
      {
        index: { byteStart: 6, byteEnd: 6 },
        features: [
          { $type: 'app.bsky.richtext.facet#link', uri: longUrl },
        ],
      },
    ];
    const { getByRole } = render(
      <RichTextWithFacets text={text} facets={facets} />,
    );
    const shortUrl = 'example.com/this/is/a/really/lo...';
    expect(getByRole('link', { name: shortUrl })).toBeTruthy();
  });

  it('falls back to original URI when URL is invalid', () => {
    const text = 'Hello world';
    const uri = 'not-a-url';
    const facets = [
      {
        index: { byteStart: 6, byteEnd: 6 },
        features: [
          { $type: 'app.bsky.richtext.facet#link', uri },
        ],
      },
    ];
    const { getByRole } = render(
      <RichTextWithFacets text={text} facets={facets} />,
    );
    expect(getByRole('link', { name: uri })).toBeTruthy();
  });

  it('renders tag facets as links', () => {
    const text = 'Trending #topic';
    const { start, end } = getByteRange(text, '#topic');
    const facets = [
      {
        index: { byteStart: start, byteEnd: end },
        features: [
          { $type: 'app.bsky.richtext.facet#tag', tag: 'topic' },
        ],
      },
    ];
    const { getByRole } = render(
      <RichTextWithFacets text={text} facets={facets} />,
    );
    expect(getByRole('link', { name: '#topic' })).toBeTruthy();
  });

  it('renders unknown facet types as plain text', () => {
    const text = 'Unknown';
    const facets = [
      {
        index: {
          byteStart: 0,
          byteEnd: new TextEncoder().encode(text).length,
        },
        features: [{ $type: 'unknown' }],
      },
    ];
    const { getByText, queryByRole } = render(
      <RichTextWithFacets text={text} facets={facets} />,
    );
    expect(getByText('Unknown')).toBeTruthy();
    expect(queryByRole('link')).toBeNull();
  });
});

