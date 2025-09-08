import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

export function ConversationSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      <View style={styles.conversationContent}>
        <Skeleton width={50} height={50} borderRadius={25} />
        <View style={styles.textContent}>
          <Skeleton width={150} height={16} style={styles.name} />
          <Skeleton width="100%" height={14} style={styles.lastMessage} />
        </View>
      </View>
      <View style={styles.metaInfo}>
        <Skeleton width={60} height={14} style={styles.timestamp} />
        <Skeleton width={20} height={20} borderRadius={10} style={styles.unreadBadge} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContent: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    marginBottom: 4,
  },
  lastMessage: {
    opacity: 0.7,
  },
  metaInfo: {
    alignItems: 'flex-end',
  },
  timestamp: {
    marginBottom: 4,
    opacity: 0.7,
  },
  unreadBadge: {
    opacity: 0.8,
  },
});
