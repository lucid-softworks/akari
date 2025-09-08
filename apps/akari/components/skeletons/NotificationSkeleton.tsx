import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

export function NotificationSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      {/* Icon container */}
      <View style={styles.iconContainer}>
        <Skeleton width={18} height={18} borderRadius={9} />
      </View>

      {/* Avatar container */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarsWrapper}>
          <Skeleton width={28} height={28} borderRadius={14} />
          <Skeleton width={28} height={28} borderRadius={14} style={styles.secondAvatar} />
          <Skeleton width={28} height={28} borderRadius={14} style={styles.thirdAvatar} />
        </View>
      </View>

      {/* Content container */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Skeleton width={160} height={15} style={styles.authorNames} />
          <Skeleton width={50} height={12} style={styles.timestamp} />
        </View>
        <Skeleton width="100%" height={14} style={styles.reasonText} />
        <Skeleton width="60%" height={12} style={styles.replyIndicator} />
        <View style={styles.postContentContainer}>
          <Skeleton width="85%" height={13} style={styles.postContent} />
        </View>
      </View>

      {/* Unread indicator */}
      <Skeleton width={6} height={6} borderRadius={3} style={styles.unreadIndicator} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
    minHeight: 72,
  },
  iconContainer: {
    marginRight: 10,
    marginTop: 4,
    width: 18,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  avatarsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondAvatar: {
    marginLeft: -6,
  },
  thirdAvatar: {
    marginLeft: -6,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorNames: {
    marginBottom: 0,
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    opacity: 0.6,
  },
  reasonText: {
    marginBottom: 4,
    opacity: 0.7,
  },
  replyIndicator: {
    marginBottom: 4,
    opacity: 0.6,
  },
  postContent: {
    opacity: 0.8,
  },
  postContentContainer: {
    marginTop: 8,
    paddingLeft: 16,
  },
  unreadIndicator: {
    marginLeft: 8,
    alignSelf: 'center',
  },
});
