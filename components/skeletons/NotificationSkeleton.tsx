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
      {/* Avatar container - mimics the avatarsContainer */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarsWrapper}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={40} height={40} borderRadius={20} style={styles.secondAvatar} />
        </View>
      </View>

      {/* Content container - mimics the contentContainer */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Skeleton width={200} height={16} style={styles.authorNames} />
          <Skeleton width={80} height={12} style={styles.timestamp} />
        </View>
        <Skeleton width="100%" height={15} style={styles.reasonText} />
        <Skeleton width="100%" height={14} style={styles.postContent} />
      </View>

      {/* Unread indicator */}
      <Skeleton width={8} height={8} borderRadius={4} style={styles.unreadIndicator} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  avatarsWrapper: {
    flexDirection: 'row',
  },
  secondAvatar: {
    marginLeft: -8,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorNames: {
    marginBottom: 0,
  },
  timestamp: {
    opacity: 0.7,
  },
  reasonText: {
    marginBottom: 8,
  },
  postContent: {
    opacity: 0.8,
  },
  unreadIndicator: {
    marginLeft: 8,
    alignSelf: 'center',
  },
});
