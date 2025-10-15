import { Stack, useLocalSearchParams } from 'expo-router';

import PostDetailView from '@/components/PostDetailView';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsive } from '@/hooks/useResponsive';

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { handle, rkey } = useLocalSearchParams<{ handle: string; rkey: string }>();
  const { isLargeScreen } = useResponsive();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('navigation.post'),
          headerBackButtonDisplayMode: 'minimal',
          headerShown: isLargeScreen,
          headerBackVisible: true,
        }}
      />
      <PostDetailView actor={handle} rKey={rkey} />
    </>
  );
}
