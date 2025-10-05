import { Link } from 'expo-router';
import { ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

type Facet = {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: {
    $type: string;
    uri?: string;
    tag?: string;
    did?: string;
  }[];
};

type RichTextWithFacetsProps = {
  text: string;
  facets?: Facet[];
  style?: any;
  containerStyle?: ViewStyle;
  onPress?: () => void;
};

type TextSegment = {
  text: string;
  start: number;
  end: number;
  type: 'text' | 'mention' | 'link' | 'tag';
  uri?: string;
  tag?: string;
  handle?: string;
  did?: string;
};

export function RichTextWithFacets({ text, facets, style, containerStyle, onPress }: RichTextWithFacetsProps) {
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

  const tagColor = useThemeColor(
    {
      light: '#007AFF',
      dark: '#0A84FF',
    },
    'tint',
  );

  // Convert UTF-8 byte index to UTF-16 character index
  const byteToCharIndex = (text: string, byteIndex: number): number => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);

    if (byteIndex >= bytes.length) return text.length;

    // Use TextDecoder to convert bytes back to string up to the byte index
    const decoder = new TextDecoder();
    const partialBytes = bytes.slice(0, byteIndex);
    const partialString = decoder.decode(partialBytes, { stream: true });

    return partialString.length;
  };

  // Parse text into segments based on facets
  const parseTextWithFacets = (): TextSegment[] => {
    if (!facets || facets.length === 0) {
      return [{ text, start: 0, end: text.length, type: 'text' }];
    }

    const segments: TextSegment[] = [];
    let currentPos = 0;

    // Sort facets by start position
    const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

    for (const facet of sortedFacets) {
      const feature = facet.features[0];

      // Convert byte indices to character indices
      const charStart = byteToCharIndex(text, facet.index.byteStart);
      const charEnd = byteToCharIndex(text, facet.index.byteEnd);
      const facetText = text.slice(charStart, charEnd);

      // Add text before this facet
      if (charStart > currentPos) {
        segments.push({
          text: text.slice(currentPos, charStart),
          start: currentPos,
          end: charStart,
          type: 'text',
        });
      }

      // Add the facet text
      if (feature) {
        switch (feature.$type) {
          case 'app.bsky.richtext.facet#mention':
            segments.push({
              text: facetText,
              start: charStart,
              end: charEnd,
              type: 'mention',
              did: feature.did,
            });
            break;
          case 'app.bsky.richtext.facet#link':
            segments.push({
              text: facetText,
              start: charStart,
              end: charEnd,
              type: 'link',
              uri: feature.uri,
            });
            break;
          case 'app.bsky.richtext.facet#tag':
            segments.push({
              text: facetText,
              start: charStart,
              end: charEnd,
              type: 'tag',
              tag: feature.tag,
            });
            break;
          default:
            segments.push({
              text: facetText,
              start: charStart,
              end: charEnd,
              type: 'text',
            });
        }
      } else {
        segments.push({
          text: facetText,
          start: charStart,
          end: charEnd,
          type: 'text',
        });
      }

      currentPos = charEnd;
    }

    // Add remaining text after the last facet
    if (currentPos < text.length) {
      segments.push({
        text: text.slice(currentPos),
        start: currentPos,
        end: text.length,
        type: 'text',
      });
    }

    return segments;
  };

  const segments = parseTextWithFacets();

  // Convert URI to short URL for display
  const toShortUrl = (href: string): string => {
    try {
      const url = new URL(href);
      const host = url.hostname;
      const path = url.pathname;

      if (path.length > 20) {
        return host + path.substring(0, 20) + '...';
      }

      return host + path;
    } catch {
      return href;
    }
  };

  return (
    <ThemedText style={[style, containerStyle]}>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'text':
            return segment.text;

          case 'mention':
            if (segment.did) {
              // For mentions, we need to extract the handle from the text since the did is just the DID
              // The text should contain the actual handle (e.g., "@miragreen.bsky.social")
              const handle = segment.text.replace(/^@/, ''); // Remove the @ symbol
              return (
                <Link key={index} href={`/(tabs)/profile/${handle}`}>
                  <ThemedText style={[{ color: mentionColor }]}>{segment.text}</ThemedText>
                </Link>
              );
            }
            return segment.text;

          case 'link':
            if (segment.uri) {
              return (
                <Link key={index} href={segment.uri as any}>
                  <ThemedText style={[{ color: linkColor }]}>{segment.text || toShortUrl(segment.uri)}</ThemedText>
                </Link>
              );
            }
            return segment.text;

          case 'tag':
            return (
              <Link key={index} href={`/search?q=${encodeURIComponent(segment.text)}`}>
                <ThemedText style={[{ color: tagColor }]}>{segment.text}</ThemedText>
              </Link>
            );

          default:
            return segment.text;
        }
      })}
    </ThemedText>
  );
}
