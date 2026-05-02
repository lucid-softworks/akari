import { useLocalSearchParams } from 'expo-router';

import PostDetailView from '@/components/PostDetailView';

export default function PostDetailScreen() {
  const { handle, rkey } = useLocalSearchParams<{ handle: string; rkey: string }>();
  return <PostDetailView actor={handle} rKey={rkey} />;
}
