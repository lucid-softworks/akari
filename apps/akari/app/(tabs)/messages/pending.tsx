import { router } from 'expo-router';
import React from 'react';

import { MessagesListScreen } from '@/components/messages/MessagesListScreen';

export default function PendingMessagesScreen() {
  const handleBackPress = React.useCallback(() => {
    router.back();
  }, []);

  return (
    <MessagesListScreen
      status="request"
      titleKey="common.pendingChats"
      onBackPress={handleBackPress}
    />
  );
}
