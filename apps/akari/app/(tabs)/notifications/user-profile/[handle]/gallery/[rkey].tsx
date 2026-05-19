import { useLocalSearchParams } from 'expo-router';

import { GalleryView } from '@/components/GalleryView';

export default function GalleryDetailScreen() {
  const { handle, rkey } = useLocalSearchParams<{ handle: string; rkey: string }>();
  return <GalleryView actor={handle} rkey={rkey} />;
}
