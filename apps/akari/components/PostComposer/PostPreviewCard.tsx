import { View } from 'react-native';

import { Image } from '@/components/Image';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { extractQuotedMedia } from '@/utils/postComposer/extractQuotedMedia';
import type { PostPreview } from '@/utils/postComposer/types';

import { styles } from './styles';

type PostPreviewCardProps = {
  post: PostPreview;
  borderColor: string;
  textColor: string;
  iconColor: string;
};

export function PostPreviewCard({ post, borderColor, textColor, iconColor }: PostPreviewCardProps) {
  const media = extractQuotedMedia({
    uri: '',
    cid: '',
    author: post.author,
    embed: post.embed,
    embeds: post.embeds,
  });
  const hasImages = media.images.length > 0;
  const hasVideo = !!media.video;
  const hasExternal = !!media.external;

  return (
    <View style={styles.quoteContainer}>
      <ThemedView style={[styles.quoteCard, { borderColor }]}>
        <View style={styles.quoteHeader}>
          {post.author.avatar ? (
            <Image source={{ uri: post.author.avatar }} style={styles.quoteAvatar} />
          ) : (
            <View style={[styles.quoteAvatar, { backgroundColor: borderColor }]} />
          )}
          <View style={styles.quoteAuthorText}>
            {post.author.displayName ? (
              <ThemedText
                style={[styles.quoteAuthorName, { color: textColor }]}
                numberOfLines={1}
              >
                {post.author.displayName}
              </ThemedText>
            ) : null}
            <ThemedText
              style={[styles.quoteAuthorHandle, { color: iconColor }]}
              numberOfLines={1}
            >
              @{post.author.handle}
            </ThemedText>
          </View>
        </View>

        {post.text ? (
          <RichTextWithFacets
            text={post.text}
            facets={post.facets}
            disableLinks
            style={[styles.quoteText, { color: textColor }]}
          />
        ) : null}

        {hasVideo && media.video && (
          <View
            style={[
              styles.quoteMediaSingle,
              { aspectRatio: media.video.aspectRatio ?? 16 / 9 },
            ]}
          >
            <Image
              source={{ uri: media.video.thumb }}
              style={styles.quoteMediaImage}
              contentFit="cover"
            />
            <View style={styles.quoteVideoBadge}>
              <IconSymbol name="play.fill" size={18} color="#ffffff" />
            </View>
          </View>
        )}

        {!hasVideo && hasImages && media.images.length === 1 && (
          <Image
            source={{ uri: media.images[0].url }}
            style={[
              styles.quoteImageSingle,
              { aspectRatio: media.images[0].aspectRatio ?? 1 },
            ]}
            contentFit="cover"
          />
        )}

        {!hasVideo && hasImages && media.images.length > 1 && (
          <View style={styles.quoteImagesRow}>
            {media.images.map((img) => (
              <Image
                key={img.url}
                source={{ uri: img.url }}
                style={styles.quoteImageThumb}
                contentFit="cover"
              />
            ))}
          </View>
        )}

        {!hasVideo && !hasImages && hasExternal && media.external && (
          <View style={[styles.quoteMediaSingle, { aspectRatio: 1.91 }]}>
            <Image
              source={{ uri: media.external.thumb }}
              style={styles.quoteMediaImage}
              contentFit="cover"
            />
          </View>
        )}
      </ThemedView>
    </View>
  );
}
