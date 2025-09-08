import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

export function ProfileHeaderSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      {/* Banner */}
      <Skeleton width="100%" height={120} borderRadius={0} />

      {/* Profile info */}
      <View style={styles.profileInfo}>
        <View style={styles.avatarContainer}>
          <Skeleton width={80} height={80} borderRadius={40} style={styles.avatar} />
        </View>

        <View style={styles.headerActions}>
          <Skeleton width={100} height={36} borderRadius={18} />
          <Skeleton width={40} height={36} borderRadius={18} />
        </View>
      </View>

      {/* Profile details */}
      <View style={styles.profileDetails}>
        <Skeleton width={150} height={24} style={styles.displayName} />
        <Skeleton width={120} height={16} style={styles.handle} />

        <View style={styles.description}>
          <Skeleton width="100%" height={16} style={styles.descriptionLine} />
          <Skeleton width="80%" height={16} style={styles.descriptionLine} />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Skeleton width={40} height={16} />
            <Skeleton width={60} height={14} style={styles.statLabel} />
          </View>
          <View style={styles.statItem}>
            <Skeleton width={40} height={16} />
            <Skeleton width={60} height={14} style={styles.statLabel} />
          </View>
          <View style={styles.statItem}>
            <Skeleton width={40} height={16} />
            <Skeleton width={60} height={14} style={styles.statLabel} />
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  profileDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  displayName: {
    marginBottom: 4,
  },
  handle: {
    marginBottom: 12,
    opacity: 0.7,
  },
  description: {
    marginBottom: 16,
  },
  descriptionLine: {
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: 4,
    opacity: 0.7,
  },
});
