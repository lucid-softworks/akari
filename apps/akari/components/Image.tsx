/**
 * Drop-in replacement for `expo-image`'s `Image`. Rewrites the source URI
 * through `rewriteCdnUrl` so the user's custom-CDN preference applies to
 * every rendered image without each call site needing to remember.
 *
 * Non-CDN URLs (Tenor GIFs, TMDb posters, YouTube thumbnails, local
 * `file://` URIs, etc.) round-trip unchanged.
 */

import {
  Image as ExpoImage,
  type ImageProps,
  type ImageSource,
} from 'expo-image';
import React, { useMemo } from 'react';

import { rewriteCdnUrl } from '@/utils/cdn';

type SourceInput = ImageProps['source'];

function rewriteSource(source: SourceInput): SourceInput {
  if (source == null) return source;
  if (typeof source === 'number') return source;
  if (typeof source === 'string') return rewriteCdnUrl(source) ?? source;
  if (Array.isArray(source)) {
    return source.map((entry) => rewriteSource(entry as SourceInput)) as SourceInput;
  }
  if (typeof source === 'object' && 'uri' in source && source.uri) {
    const next = rewriteCdnUrl(source.uri);
    if (next === source.uri) return source;
    return { ...(source as ImageSource), uri: next };
  }
  return source;
}

export function Image(props: ImageProps) {
  const transformed = useMemo(() => rewriteSource(props.source), [props.source]);
  return <ExpoImage {...props} source={transformed} />;
}

export type { ImageProps, ImageSource } from 'expo-image';
