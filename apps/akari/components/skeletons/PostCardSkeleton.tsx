import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { ThemedView } from '@/components/ThemedView';
import { spacing, radius, layout, opacity } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export function PostCardSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <Skeleton width={layout.avatarMedium} height={layout.avatarMedium} borderRadius={radius.full} />
          <View style={styles.authorText}>
            <Skeleton width={120} height={16} style={styles.displayName} />
            <Skeleton width={80} height={14} style={styles.handle} />
          </View>
        </View>
        <Skeleton width={60} height={14} />
      </View>

      {/* Content + actions sit in a column that's offset by the
          avatar width + gap so the loading state previews the same
          layout the rendered card uses — otherwise the skeleton
          collapses to full-width and the page jumps when posts
          finally arrive. */}
      <View style={styles.contentColumn}>
        <View style={styles.content}>
          <Skeleton width="100%" height={16} style={styles.textLine} />
          <Skeleton width="85%" height={16} style={styles.textLine} />
          <Skeleton width="70%" height={16} style={styles.textLine} />
        </View>

        {/* Media placeholder */}
        <View style={styles.mediaContainer}>
          <Skeleton width="100%" height={200} borderRadius={radius.sm} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Skeleton width={20} height={20} borderRadius={radius.full} />
            <Skeleton width={30} height={14} style={styles.actionText} />
          </View>
          <View style={styles.actionItem}>
            <Skeleton width={20} height={20} borderRadius={radius.full} />
            <Skeleton width={30} height={14} style={styles.actionText} />
          </View>
          <View style={styles.actionItem}>
            <Skeleton width={20} height={20} borderRadius={radius.full} />
            <Skeleton width={30} height={14} style={styles.actionText} />
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

// Same avatar-column geometry the real PostCard uses; defining it
// locally rather than importing from PostCard avoids a circular
// dependency between the skeleton and the card.
const AVATAR_COLUMN_OFFSET = layout.avatarMedium + spacing.sm;

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderBottomWidth: layout.border,
  },
  contentColumn: {
    paddingLeft: AVATAR_COLUMN_OFFSET,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  displayName: {
    marginBottom: spacing.xs,
  },
  handle: {
    opacity: opacity.secondary,
  },
  content: {
    marginBottom: spacing.md,
  },
  textLine: {
    marginBottom: spacing.sm,
  },
  mediaContainer: {
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: spacing.sm,
  },
}); 