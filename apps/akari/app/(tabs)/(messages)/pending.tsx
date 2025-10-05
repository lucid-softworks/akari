import { router } from 'expo-router';
import React from 'react';

import { MessagesListScreen } from './index';

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
