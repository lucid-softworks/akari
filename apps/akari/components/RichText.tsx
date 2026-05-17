import { tokenize } from '@atcute/bluesky-richtext-parser';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useProfileHref } from '@/utils/navigation';

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

export function RichText({ text, style, containerStyle }: RichTextProps) {
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

  const profileHref = useProfileHref();

  // Trim whitespace and parse the text. Tokens are rebuilt deterministically
  // from `text`, but the same URL / handle can legitimately appear twice in
  // one post, so we need a position-aware disambiguator in each key. Compute
  // those keys here (outside JSX) so the render loop never has to read the
  // map index back, keeping `no-array-index-as-key` happy.
  const tokensWithKeys = useMemo(() => {
    const trimmedText = text.replace(WHITESPACE_TRIM_RE, '');
    return tokenize(trimmedText).map((token, index) => {
      let key: string;
      switch (token.type) {
        case 'link':
          key = `link-${index}-${token.url}`;
          break;
        case 'autolink':
          key = `autolink-${index}-${token.url}`;
          break;
        case 'mention':
          key = `mention-${index}-${token.handle}`;
          break;
        default:
          key = `${token.type}-${index}`;
      }
      return { token, key };
    });
  }, [text]);

  return (
    <ThemedText style={[style, containerStyle]}>
      {tokensWithKeys.map(({ token, key }) => {
        switch (token.type) {
          case 'text':
            return token.text;

          case 'link':
            return (
              <Link key={key} href={token.url as any}>
                <ThemedText style={{ color: linkColor }}>{token.text || toShortUrl(token.url)}</ThemedText>
              </Link>
            );

          case 'autolink':
            return (
              <Link key={key} href={token.url as any}>
                <ThemedText style={{ color: linkColor }}>{toShortUrl(token.url)}</ThemedText>
              </Link>
            );

          case 'mention':
            return (
              <Link key={key} push href={profileHref(token.handle) as any}>
                <ThemedText style={{ color: mentionColor }}>@{token.handle}</ThemedText>
              </Link>
            );

          default:
            return token.raw;
        }
      })}
    </ThemedText>
  );
}
