import { useLocalSearchParams } from 'expo-router';

import FeedView from '@/components/FeedView';

export default function FeedDetailScreen() {
  const { handle, rkey } = useLocalSearchParams<{ handle: string; rkey: string }>();
  return <FeedView actor={handle} rKey={rkey} />;
}
