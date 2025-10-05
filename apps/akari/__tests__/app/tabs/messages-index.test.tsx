import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

import MessagesScreen from '@/app/(tabs)/(messages)';
import { router } from 'expo-router';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useConversations } from '@/hooks/queries/useConversations';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { mockScrollToOffset } from '../../../test-utils/flash-list';

jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

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
const mockRegister = tabScrollRegistry.register as jest.Mock;

describe('MessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
    mockScrollToOffset.mockReset();
  });

  it('renders accepted conversations and navigates', () => {
    const fetchNextPage = jest.fn();
    const conversations = [
      {
        id: '1',
        handle: 'alice',
        displayName: 'Alice',
        lastMessage: 'hi',
        timestamp: 'now',
        unreadCount: 3,
        status: 'accepted',
        muted: false,
      },
      {
        id: '2',
        handle: 'charlie',
        displayName: 'Charlie',
        lastMessage: 'hello',
        timestamp: 'earlier',
        unreadCount: 150,
        status: 'accepted',
        muted: false,
        avatar: 'https://example.com/avatar.png',
      },
      {
        id: '3',
        handle: 'bob smith',
        displayName: 'Bob Smith',
        lastMessage: 'hey there',
        timestamp: 'earlier',
        unreadCount: 2,
        status: 'request',
        muted: false,
      },
    ];
    mockUseConversations.mockReturnValue({
      data: { pages: [{ conversations }] },
      isLoading: false,
      error: null,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText, queryByText, UNSAFE_getAllByType, UNSAFE_getByType } = render(<MessagesScreen />);

    expect(mockUseConversations).toHaveBeenCalled();
    const [limitArg, , statusArg] = mockUseConversations.mock.calls[0];
    expect(limitArg).toBe(50);
    expect(statusArg).toBe('accepted');
    expect(mockRegister).toHaveBeenCalledWith('messages', expect.any(Function));
    expect(UNSAFE_getByType(VirtualizedList).props.ListFooterComponent()).toBeNull();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Charlie')).toBeTruthy();
    expect(queryByText('Bob Smith')).toBeNull();
    expect(getByText('99+')).toBeTruthy();
    expect(queryByText('common.pending')).toBeNull();
    expect(getByText('common.viewPendingChats')).toBeTruthy();

    fireEvent.press(getByText('common.viewPendingChats'));
    expect(mockRouterPush).toHaveBeenNthCalledWith(1, '/(tabs)/(messages)/pending');

    fireEvent.press(getByText('Alice'));
    expect(mockRouterPush).toHaveBeenNthCalledWith(2, '/(tabs)/(messages)/alice');

    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[2]);
    expect(mockRouterPush).toHaveBeenNthCalledWith(3, '/users/alice');
  });

  it('scrolls to top when registry callback is triggered', () => {
    const conversations = [
      {
        id: '1',
        handle: 'alice',
        displayName: 'Alice',
        lastMessage: 'hi',
        timestamp: 'now',
        unreadCount: 0,
        status: 'accepted',
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

    const { UNSAFE_getByType } = render(<MessagesScreen />);

    const scrollToTop = mockRegister.mock.calls[0][1];

    act(() => {
      scrollToTop();
    });

    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });

  it('shows loading skeletons', () => {
    mockUseConversations.mockReturnValue({
      data: { pages: [] },
      isLoading: true,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getAllByText } = render(<MessagesScreen />);
    expect(getAllByText('Skeleton')).toHaveLength(10);
  });

  it('shows error state', () => {
    mockUseConversations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'oops' },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<MessagesScreen />);
    expect(getByText('common.errorLoadingConversations')).toBeTruthy();
  });

  it('shows empty state', () => {
    mockUseConversations.mockReturnValue({
      data: { pages: [{ conversations: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<MessagesScreen />);
    expect(getByText('common.noConversations')).toBeTruthy();
  });

  it('fetches next page when end reached', () => {
    const fetchNextPage = jest.fn();
    mockUseConversations.mockReturnValue({
      data: { pages: [{ conversations: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<MessagesScreen />);

    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer when fetching', () => {
    const fetchNextPage = jest.fn();
    mockUseConversations.mockReturnValue({
      data: { pages: [{ conversations: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText, UNSAFE_getByType } = render(<MessagesScreen />);
    expect(getByText('common.loading...')).toBeTruthy();

    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
