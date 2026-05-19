import { Link, router } from 'expo-router';
import React, { use } from 'react';
import { Platform, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { NestedAnchorContext } from '@/components/ui/PressableLink';
import { useThemeColor } from '@/hooks/useThemeColor';
import { isExternalUrl, openExternalLink } from '@/utils/externalLink';
import { useProfileHref } from '@/utils/navigation';

type InlineFacetLinkProps = {
  href: string;
  push?: boolean;
  insideAnchor: boolean;
  textStyle: { color: string };
  children: React.ReactNode;
};

/**
 * Inline link wrapper used by `RichTextWithFacets` for mentions, links, and
 * hashtags. Internal hrefs (mentions, hashtags, anything not http/https)
 * keep the expo-router `<Link>` so middle-click and right-click still open
 * in a new tab. External hrefs (http/https URLs pasted into a post) route
 * through `openExternalLink` so the leave-akari confirmation modal can
 * intercept before the browser/OS opens the URL.
 *
 * The `insideAnchor` branch is a workaround for the HTML rule against
 * nested `<a>` tags — when a rich-text segment is rendered inside a parent
 * PressableLink's `<a>`, we render as plain `Text` with `onPress` and call
 * the router directly instead.
 */
function InlineFacetLink({ href, push, insideAnchor, textStyle, children }: InlineFacetLinkProps) {
  const external = isExternalUrl(href);

  if (external) {
    return (
      <ThemedText
        accessibilityRole="link"
        style={textStyle}
        onPress={(event: { stopPropagation?: () => void }) => {
          event?.stopPropagation?.();
          void openExternalLink(href);
        }}
      >
        {children}
      </ThemedText>
    );
  }

  if (Platform.OS === 'web' && insideAnchor) {
    return (
      <ThemedText
        accessibilityRole="link"
        style={textStyle}
        onPress={(event: { stopPropagation?: () => void }) => {
          event?.stopPropagation?.();
          router.push(href as never);
        }}
      >
        {children}
      </ThemedText>
    );
  }
  return (
    <Link push={push} href={href as never}>
      <ThemedText style={textStyle}>{children}</ThemedText>
    </Link>
  );
}

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
  /** Render facet segments coloured but non-interactive (e.g. inside a quote preview). */
  disableLinks?: boolean;
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

export function RichTextWithFacets({ text, facets, style, containerStyle, disableLinks }: RichTextWithFacetsProps) {
  const insideAnchor = use(NestedAnchorContext);
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

  const profileHref = useProfileHref();

  // Convert UTF-8 byte index to UTF-16 character index
  const byteToCharIndex = (source: string, byteIndex: number): number => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(source);

    if (byteIndex >= bytes.length) return source.length;

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
    const sortedFacets = [...facets].toSorted((a, b) => a.index.byteStart - b.index.byteStart);

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
      {segments.map((segment) => {
        switch (segment.type) {
          case 'text':
            return segment.text;

          case 'mention':
            if (segment.did) {
              // For mentions, we need to extract the handle from the text since the did is just the DID
              // The text should contain the actual handle (e.g., "@miragreen.bsky.social")
              const handle = segment.text.replace(/^@/, ''); // Remove the @ symbol
              const mentionKey = `mention-${segment.start}-${segment.end}`;
              if (disableLinks) {
                return (
                  <ThemedText key={mentionKey} style={{ color: mentionColor }}>
                    {segment.text}
                  </ThemedText>
                );
              }
              return (
                <InlineFacetLink
                  key={mentionKey}
                  push
                  href={profileHref(handle)}
                  insideAnchor={insideAnchor}
                  textStyle={{ color: mentionColor }}
                >
                  {segment.text}
                </InlineFacetLink>
              );
            }
            return segment.text;

          case 'link':
            if (segment.uri) {
              const linkKey = `link-${segment.start}-${segment.end}`;
              if (disableLinks) {
                return (
                  <ThemedText key={linkKey} style={{ color: linkColor }}>
                    {segment.text || toShortUrl(segment.uri)}
                  </ThemedText>
                );
              }
              return (
                <InlineFacetLink
                  key={linkKey}
                  href={segment.uri}
                  insideAnchor={insideAnchor}
                  textStyle={{ color: linkColor }}
                >
                  {segment.text || toShortUrl(segment.uri)}
                </InlineFacetLink>
              );
            }
            return segment.text;

          case 'tag': {
            const tagValue = segment.tag ?? segment.text.replace(/^#/, '');
            const hashtagQuery = `#${tagValue}`;
            const tagKey = `tag-${segment.start}-${segment.end}`;
            if (disableLinks) {
              return (
                <ThemedText key={tagKey} style={{ color: tagColor }}>
                  {segment.text}
                </ThemedText>
              );
            }
            return (
              <InlineFacetLink
                key={tagKey}
                href={`/search?query=${encodeURIComponent(hashtagQuery)}`}
                insideAnchor={insideAnchor}
                textStyle={{ color: tagColor }}
              >
                {segment.text}
              </InlineFacetLink>
            );
          }

          default:
            return segment.text;
        }
      })}
    </ThemedText>
  );
}
