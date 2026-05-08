import { Stack, useLocalSearchParams } from 'expo-router';

import FeedView from '@/components/FeedView';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

export default function FeedDetailScreen() {
  const { t } = useTranslation();
  const { handle, rkey } = useLocalSearchParams<{ handle: string; rkey: string }>();
  const { isLargeNative } = useResponsive();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('feed.feed'),
          headerBackButtonDisplayMode: 'minimal',
          headerShown: isLargeNative,
          headerBackVisible: true,
        }}
      />
      <FeedView actor={handle} rKey={rkey} />
    </>
  );
}
