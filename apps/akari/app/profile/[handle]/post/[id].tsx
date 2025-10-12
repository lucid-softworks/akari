import { useTranslation } from '@/hooks/useTranslation';
import { Stack, useLocalSearchParams } from 'expo-router';

import PostDetailScreen from '@/components/PostDetailScreen';
import { TabBackButton } from '@/components/TabBackButton';
import { usePostUri } from '@/hooks/usePostUri';

export default function ProfilePostDetailRoute() {
  const { id, handle } = useLocalSearchParams<{ id: string; handle: string }>();
  const { t } = useTranslation();

  // Use the handle from the URL to reconstruct the full URI if needed
  const postUri = usePostUri(id || '', handle);

  // Debug logging
  console.log(`ProfilePostDetailRoute - id: ${id}, handle: ${handle}, postUri: ${postUri}`);

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
