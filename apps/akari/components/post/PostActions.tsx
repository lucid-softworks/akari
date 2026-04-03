import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, fontSize, opacity, activeOpacity, semanticColors } from '@/constants/tokens';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useThemeColor } from '@/hooks/useThemeColor';

type PostActionsProps = {
  uri?: string;
  cid?: string;
  likeUri?: string;
  authorName: string;
  commentCount: number;
  repostCount: number;
  likeCount: number;
  onReplyPress: () => void;
};

export const PostActions = React.memo(function PostActions({
  uri,
  cid,
  likeUri,
  authorName,
  commentCount,
  repostCount,
  likeCount,
  onReplyPress,
}: PostActionsProps) {
  const likeMutation = useLikePost();
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

  return (
    <ThemedView style={styles.interactions}>
      <TouchableOpacity
        style={styles.interactionItem}
        onPress={onReplyPress}
        activeOpacity={activeOpacity.default}
        accessibilityRole="button"
        accessibilityLabel={`Reply to post by ${authorName}`}
      >
        <IconSymbol name="bubble.left" size={16} color={iconColor} style={styles.interactionIcon} />
        <ThemedText style={styles.interactionCount}>{commentCount}</ThemedText>
      </TouchableOpacity>
      <ThemedView style={styles.interactionItem}>
        <IconSymbol name="arrow.2.squarepath" size={16} color={iconColor} style={styles.interactionIcon} />
        <ThemedText style={styles.interactionCount}>{repostCount}</ThemedText>
      </ThemedView>
      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleLikePress}
        activeOpacity={activeOpacity.default}
        accessibilityRole="button"
        accessibilityLabel={isLiked ? `Unlike post by ${authorName}` : `Like post by ${authorName}`}
      >
        <IconSymbol
          name={isLiked ? 'heart.fill' : 'heart'}
          size={16}
          color={isLiked ? semanticColors.like : iconColor}
          style={styles.interactionIcon}
        />
        <ThemedText style={styles.interactionCount}>{likeCount}</ThemedText>
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
  interactionIcon: {},
  interactionCount: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
});
