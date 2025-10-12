import { useTranslation } from '@/hooks/useTranslation';
import { Stack, useLocalSearchParams } from 'expo-router';

import PostDetailScreen from '@/components/PostDetailScreen';
import { TabBackButton } from '@/components/TabBackButton';
import { usePostUri } from '@/hooks/usePostUri';

export default function PostDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  // For the main post route, we don't have a handle, so we'll use the postId as is
  // If it's a full URI, it will work. If it's just a record key, it might not work
  // but that's a limitation of this route
  const postUri = usePostUri(id || '');

  // Debug logging
  console.log(`PostDetailRoute - id: ${id}, postUri: ${postUri}`);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('navigation.post'),
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <TabBackButton />,
        }}
      />
      <PostDetailScreen postId={postUri} />
    </>
  );
}
