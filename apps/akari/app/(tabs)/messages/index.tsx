import { router } from 'expo-router';
import React from 'react';

import { GuestSignInRequired } from '@/components/GuestSignInRequired';
import { MessagesListScreen } from '@/components/messages/MessagesListScreen';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useTranslation } from '@/hooks/useTranslation';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const isGuest = useIsGuest();

  const handleNavigateToPending = React.useCallback(() => {
    router.push('/(tabs)/messages/pending');
  }, []);

  if (isGuest) {
    return <GuestSignInRequired title={t('common.messages')} />;
  }

  return (
    <MessagesListScreen
      titleKey="common.messages"
      pendingButtonConfig={{
        labelKey: 'common.viewPendingChats',
        onPress: handleNavigateToPending,
      }}
    />
  );
}
