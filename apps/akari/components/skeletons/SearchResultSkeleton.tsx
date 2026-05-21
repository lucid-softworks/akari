import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { ThemedView } from '@/components/ThemedView';
import { layout, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * Placeholder card matching `SearchProfileResult`'s layout — same row
 * padding (lg horizontal / md vertical), same 48px avatar, same stacked
 * info column (display name + handle + two-line description). The
 * previous version painted a 16/16 box with a fake "follow" button that
 * doesn't exist on the real card, so the list visibly resized when
 * results arrived. Mirroring the real card keeps the layout stable.
 */
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
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.info}>
        <Skeleton width={140} height={18} />
        <Skeleton width={110} height={14} />
        <View style={styles.descriptionLines}>
          <Skeleton width="100%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  descriptionLines: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});
