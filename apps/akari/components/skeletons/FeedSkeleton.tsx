import { StyleSheet, View } from 'react-native';

import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton';

type FeedSkeletonProps = {
  count?: number;
};

export function FeedSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- placeholder skeletons with a fixed `count`; nothing to identify them beyond position
        <PostCardSkeleton key={`feed-skeleton-${index}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 