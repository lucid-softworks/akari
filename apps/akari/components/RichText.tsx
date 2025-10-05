import { tokenize } from '@atcute/bluesky-richtext-parser';
import { Link } from 'expo-router';
import { ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

type RichTextProps = {
  text: string;
  style?: any;
  containerStyle?: ViewStyle;
  onPress?: () => void;
};

// URL parsing and validation utilities
const safeUrlParse = (href: string): URL | null => {
  try {
    const url = new URL(href);
    const protocol = url.protocol;

    if (protocol === 'https:' || protocol === 'http:') {
      return url;
    }
  } catch {
    // Invalid URL
  }

  return null;
};

const TRIM_HOST_RE = /^www\./;
const PATH_MAX_LENGTH = 16;

const toShortUrl = (href: string): string => {
  const url = safeUrlParse(href);

  if (url !== null) {
    const host =
      (url.username ? url.username + (url.password ? ':' + url.password : '') + '@' : '') +
      url.host.replace(TRIM_HOST_RE, '');

    const path =
      (url.pathname === '/' ? '' : url.pathname) +
      (url.search.length > 1 ? url.search : '') +
      (url.hash.length > 1 ? url.hash : '');

    if (path.length > PATH_MAX_LENGTH) {
      return host + path.slice(0, PATH_MAX_LENGTH - 1) + '…';
    }

    return host + path;
  }

  return href;
};

// Whitespace trimming regex
const WHITESPACE_TRIM_RE = /^\s+|\s+$| +(?=\n)|\n(?=(?: *\n){2}) */g;

export function RichText({ text, style, containerStyle, onPress }: RichTextProps) {
  const linkColor = useThemeColor(
    {
      light: '#007AFF',
      dark: '#0A84FF',
    },
    'tint',
  );

  const mentionColor = useThemeColor(
    {
      light: '#007AFF',
      dark: '#0A84FF',
    },
    'tint',
  );

  // Trim whitespace and parse the text
  const trimmedText = text.replace(WHITESPACE_TRIM_RE, '');
  const tokens = tokenize(trimmedText);

  return (
    <ThemedText style={[style, containerStyle]}>
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'text':
            return token.text;

          case 'link':
            return (
              <Link key={index} href={token.url as any}>
                <ThemedText style={[{ color: linkColor }]}>{token.text || toShortUrl(token.url)}</ThemedText>
              </Link>
            );

          case 'autolink':
            return (
              <Link key={index} href={token.url as any}>
                <ThemedText style={[{ color: linkColor }]}>{toShortUrl(token.url)}</ThemedText>
              </Link>
            );

          case 'mention':
            return (
              <Link key={index} href={`/users/${token.handle}`}>
                <ThemedText style={[{ color: mentionColor }]}>@{token.handle}</ThemedText>
              </Link>
            );

          default:
            return token.raw;
        }
      })}
    </ThemedText>
  );
}
