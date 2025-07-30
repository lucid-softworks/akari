import { StyleSheet, View } from 'react-native';

import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton';

type FeedSkeletonProps = {
  count?: number;
};

export function FeedSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 