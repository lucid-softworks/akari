import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export function SearchResultSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      <View style={styles.userInfo}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.userDetails}>
          <Skeleton width={120} height={16} style={styles.displayName} />
          <Skeleton width={100} height={14} style={styles.handle} />
        </View>
      </View>
      <Skeleton width={80} height={32} borderRadius={16} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    marginBottom: 4,
  },
  handle: {
    opacity: 0.7,
  },
}); 