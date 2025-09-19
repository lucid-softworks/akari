import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FlatList, TouchableOpacity } from 'react-native';

import PendingMessagesScreen from '@/app/(tabs)/messages/pending';
import { router } from 'expo-router';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useConversations } from '@/hooks/queries/useConversations';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { ConversationSkeleton: () => <Text>Skeleton</Text> };
});

jest.mock('@/components/ui/IconSymbol', () => ({
  IconSymbol: () => null,
}));

jest.mock('@/hooks/queries/useConversations');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: { register: jest.fn() },
}));

const mockUseConversations = useConversations as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockRouterPush = router.push as jest.Mock;
const mockRouterBack = router.back as jest.Mock;
const mockRegister = tabScrollRegistry.register as jest.Mock;

describe('PendingMessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  });

  it('renders pending conversations and supports navigation', () => {
    const conversations = [
      {
        id: 'pending-1',
        handle: 'pending-pal',
        displayName: 'Pending Pal',
        lastMessage: 'hello there',
        timestamp: 'today',
        unreadCount: 1,
        status: 'request',
        muted: false,
      },
    ];

    mockUseConversations.mockReturnValue({
      data: { pages: [{ conversations }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText, queryByText, UNSAFE_getAllByType, UNSAFE_getByType } = render(<PendingMessagesScreen />);

    expect(mockUseConversations).toHaveBeenCalled();
    const [, , status] = mockUseConversations.mock.calls[0];
    expect(status).toBe('request');

    expect(mockRegister).toHaveBeenCalledWith('messages', expect.any(Function));
    expect(UNSAFE_getByType(FlatList).props.ListFooterComponent()).toBeNull();
    expect(getByText('common.pendingChats')).toBeTruthy();
    expect(getByText('Pending Pal')).toBeTruthy();
    expect(getByText('common.pending')).toBeTruthy();
    expect(queryByText('common.viewPendingChats')).toBeNull();

    fireEvent.press(getByText('Pending Pal'));
    expect(mockRouterPush).toHaveBeenNthCalledWith(1, '/(tabs)/messages/pending-pal');

    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[2]);
    expect(mockRouterPush).toHaveBeenNthCalledWith(2, '/profile/pending-pal');

    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
