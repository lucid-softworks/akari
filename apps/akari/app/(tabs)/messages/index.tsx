import { router } from 'expo-router';
import React from 'react';

import { MessagesListScreen } from '@/components/messages/MessagesListScreen';

export default function MessagesScreen() {
  const handleNavigateToPending = React.useCallback(() => {
    router.push('/(tabs)/messages/pending');
  }, []);

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
