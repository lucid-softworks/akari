import { Stack, useLocalSearchParams } from 'expo-router';

import PostDetailView from '@/components/PostDetailView';
import { useTranslation } from '@/hooks/useTranslation';

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { handle, rkey } = useLocalSearchParams<{ handle: string; rkey: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('navigation.post'),
          headerBackButtonDisplayMode: 'minimal',
          headerShown: true,
          headerBackVisible: true,
        }}
      />
      <PostDetailView actor={handle} rKey={rkey} />
    </>
  );
}
