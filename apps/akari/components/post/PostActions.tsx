import React, { useCallback } from 'react';
import { Platform, Share, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, fontSize, opacity, activeOpacity, semanticColors, hitSlop } from '@/constants/tokens';
import { useBookmarkPost } from '@/hooks/mutations/useBookmarkPost';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useThemeColor } from '@/hooks/useThemeColor';

type PostActionsProps = {
  uri?: string;
  cid?: string;
  likeUri?: string;
  authorHandle: string;
  authorName: string;
  commentCount: number;
  repostCount: number;
  likeCount: number;
  onReplyPress: () => void;
  onMorePress: () => void;
};

export const PostActions = React.memo(function PostActions({
  uri,
  cid,
  likeUri,
  authorHandle,
  authorName,
  commentCount,
  repostCount,
  likeCount,
  onReplyPress,
  onMorePress,
}: PostActionsProps) {
  const likeMutation = useLikePost();
  const bookmarkMutation = useBookmarkPost();
  const isLiked = Boolean(likeUri);

  const iconColor = useThemeColor(
    { light: '#687076', dark: '#9BA1A6' },
    'text',
  );

  const handleLikePress = useCallback(() => {
    if (!uri || !cid) return;

    if (likeUri) {
      likeMutation.mutate({
        postUri: uri,
        likeUri,
        action: 'unlike',
      });
    } else {
      likeMutation.mutate({
        postUri: uri,
        postCid: cid,
        action: 'like',
      });
    }
  }, [uri, cid, likeUri, likeMutation]);

  const handleBookmarkPress = useCallback(() => {
    if (!uri || !cid) return;
    bookmarkMutation.mutate({
      postUri: uri,
      postCid: cid,
      action: 'bookmark',
    });
  }, [uri, cid, bookmarkMutation]);

  const handleSharePress = useCallback(() => {
    if (!uri) return;
    const postUrl = `https://bsky.app/profile/${authorHandle}/post/${uri.split('/').pop()}`;
    void Share.share(
      Platform.OS === 'ios'
        ? { url: postUrl }
        : { message: postUrl },
    );
  }, [uri, authorHandle]);

  return (
    <ThemedView style={styles.interactions}>
      <TouchableOpacity
        style={styles.interactionItem}
        onPress={onReplyPress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`Reply to post by ${authorName}`}
      >
        <IconSymbol name="bubble.left" size={16} color={iconColor} />
        <ThemedText style={styles.interactionCount}>{commentCount}</ThemedText>
      </TouchableOpacity>

      <ThemedView style={styles.interactionItem}>
        <IconSymbol name="arrow.2.squarepath" size={16} color={iconColor} />
        <ThemedText style={styles.interactionCount}>{repostCount}</ThemedText>
      </ThemedView>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleLikePress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={isLiked ? `Unlike post by ${authorName}` : `Like post by ${authorName}`}
      >
        <IconSymbol
          name={isLiked ? 'heart.fill' : 'heart'}
          size={16}
          color={isLiked ? semanticColors.like : iconColor}
        />
        <ThemedText style={styles.interactionCount}>{likeCount}</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleBookmarkPress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Save post"
      >
        <IconSymbol name="bookmark" size={16} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleSharePress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Share post"
      >
        <IconSymbol name="square.and.arrow.up" size={16} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={onMorePress}
        activeOpacity={activeOpacity.strong}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`More actions for post by ${authorName}`}
      >
        <IconSymbol name="ellipsis" size={16} color={iconColor} />
      </TouchableOpacity>
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  interactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  interactionCount: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
});
