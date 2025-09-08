import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

export function PostDetailSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={styles.container}>
      {/* Main Post Skeleton */}
      <ThemedView style={[styles.postContainer, { borderBottomColor: borderColor }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.authorText}>
              <Skeleton width={120} height={16} style={styles.displayName} />
              <Skeleton width={80} height={14} style={styles.handle} />
            </View>
          </View>
          <Skeleton width={60} height={14} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Skeleton width="100%" height={16} style={styles.textLine} />
          <Skeleton width="85%" height={16} style={styles.textLine} />
          <Skeleton width="70%" height={16} style={styles.textLine} />
        </View>

        {/* Media placeholder */}
        <View style={styles.mediaContainer}>
          <Skeleton width="100%" height={200} borderRadius={8} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width={30} height={14} style={styles.actionText} />
          </View>
          <View style={styles.actionItem}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width={30} height={14} style={styles.actionText} />
          </View>
          <View style={styles.actionItem}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width={30} height={14} style={styles.actionText} />
          </View>
        </View>
      </ThemedView>

      {/* Comments Section */}
      <ThemedView style={[styles.commentsSection, { borderBottomColor: borderColor }]}>
        <Skeleton width={100} height={16} />
      </ThemedView>

      {/* Comments Skeletons */}
      {Array.from({ length: 5 }).map((_, index) => (
        <ThemedView key={index} style={[styles.commentContainer, { borderBottomColor: borderColor }]}>
          <View style={styles.commentHeader}>
            <View style={styles.commentAuthorInfo}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <View style={styles.commentAuthorText}>
                <Skeleton width={100} height={14} style={styles.commentDisplayName} />
                <Skeleton width={70} height={12} style={styles.commentHandle} />
              </View>
            </View>
            <Skeleton width={50} height={12} />
          </View>
          <View style={styles.commentContent}>
            <Skeleton width="100%" height={14} style={styles.commentTextLine} />
            <Skeleton width="80%" height={14} style={styles.commentTextLine} />
          </View>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    marginBottom: 4,
  },
  handle: {
    opacity: 0.7,
  },
  content: {
    marginBottom: 12,
  },
  textLine: {
    marginBottom: 8,
  },
  mediaContainer: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 8,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  commentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAuthorText: {
    marginLeft: 8,
    flex: 1,
  },
  commentDisplayName: {
    marginBottom: 2,
  },
  commentHandle: {
    opacity: 0.7,
  },
  commentContent: {
    marginLeft: 40, // Align with comment text
  },
  commentTextLine: {
    marginBottom: 6,
  },
});
