import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { VerificationBadge } from '@/components/VerificationBadge';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { usePost } from '@/hooks/queries/usePost';
import { useThemeColor } from '@/hooks/useThemeColor';

type PostInlineCardProps = {
  handle: string;
  rkey: string;
  /** When provided, tapping the card runs this callback (e.g. navigate
   *  to the post). Otherwise the card is non-interactive. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact "look-at-this-post" card. Used by the chat embed renderer
 * for inline Bluesky post URLs and by the share-compose preview so
 * the author can see what their recipient will see before sending.
 */
export function PostInlineCard({ handle, rkey, onPress, style }: PostInlineCardProps) {
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor(
    { light: '#687076', dark: '#9BA1A6' },
    'text',
  );

  const { data: post } = usePost({ actor: handle, rKey: rkey });

  const author = post?.author;
  const rawText = (post?.record as { text?: unknown } | undefined)?.text;
  const text = typeof rawText === 'string' ? rawText : '';

  // Pull the first image / video thumb / external thumb out of the
  // embed so the preview matches what the post actually shows.
  // recordWithMedia nests its media under `embed.media`.
  type EmbedShape = {
    $type?: string;
    images?: { thumb?: string; fullsize?: string; aspectRatio?: { width: number; height: number } }[];
    thumbnail?: string;
    aspectRatio?: { width: number; height: number };
    external?: { thumb?: { ref?: { $link?: string } } | string; uri?: string };
    media?: EmbedShape;
  };
  const embedShape = post?.embed as EmbedShape | undefined;
  const mediaSource: EmbedShape | undefined = embedShape?.media ?? embedShape;
  const previewImage: { uri: string; aspectRatio?: number } | null = (() => {
    if (!mediaSource) return null;
    if (mediaSource.images && mediaSource.images.length > 0) {
      const img = mediaSource.images[0];
      const url = img.thumb || img.fullsize;
      if (!url) return null;
      const ar = img.aspectRatio
        ? img.aspectRatio.width / img.aspectRatio.height
        : undefined;
      return { uri: url, aspectRatio: ar };
    }
    if (mediaSource.thumbnail) {
      const ar = mediaSource.aspectRatio
        ? mediaSource.aspectRatio.width / mediaSource.aspectRatio.height
        : 16 / 9;
      return { uri: mediaSource.thumbnail, aspectRatio: ar };
    }
    if (mediaSource.external?.thumb) {
      const thumbRef = mediaSource.external.thumb;
      const uri =
        typeof thumbRef === 'string'
          ? thumbRef
          : thumbRef?.ref?.$link;
      if (uri) return { uri, aspectRatio: 1.91 };
    }
    return null;
  })();
  const isVideo = mediaSource?.$type?.includes('video') ?? false;

  const inner = (
    <View style={[styles.card, { borderColor }, style]}>
      <View style={styles.header}>
        {author?.avatar ? (
          <Image source={{ uri: author.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: borderColor }]} />
        )}
        <View style={styles.headerText}>
          {author?.displayName ? (
            <View style={styles.displayNameRow}>
              <ThemedText
                style={[styles.displayName, { color: textColor }]}
                numberOfLines={1}
              >
                {author.displayName}
              </ThemedText>
              <VerificationBadge
                verification={author.verification}
                subjectHandle={author.handle}
                subjectDisplayName={author.displayName}
                size={fontSize.base}
              />
            </View>
          ) : null}
          <ThemedText
            style={[styles.handle, { color: mutedTextColor }]}
            numberOfLines={1}
          >
            @{author?.handle ?? handle}
          </ThemedText>
        </View>
      </View>
      {text ? (
        <ThemedText style={[styles.text, { color: textColor }]} numberOfLines={4}>
          {text}
        </ThemedText>
      ) : null}
      {previewImage ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: previewImage.uri }}
            style={styles.image}
            contentFit="cover"
          />
          {isVideo ? (
            <View style={styles.videoBadge}>
              <View style={styles.videoBadgeInner} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  handle: {
    fontSize: fontSize.xs,
  },
  text: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeInner: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: '#ffffff',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
