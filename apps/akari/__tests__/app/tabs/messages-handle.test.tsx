import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList, Keyboard } from 'react-native';

import ConversationScreen from '@/app/(tabs)/messages/[handle]';
import { useLocalSearchParams } from 'expo-router';
import { useConversations } from '@/hooks/queries/useConversations';
import { useMessages } from '@/hooks/queries/useMessages';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: (props: any) => <View {...props} /> };
});

jest.mock('@/components/ui/IconSymbol', () => {
  const { Text } = require('react-native');
  return { IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text> };
});

jest.mock('@/hooks/queries/useConversations');
jest.mock('@/hooks/queries/useMessages');
jest.mock('@/hooks/mutations/useSendMessage');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/alert');

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUseConversations = useConversations as jest.Mock;
const mockUseMessages = useMessages as jest.Mock;
const mockUseSendMessage = useSendMessage as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
  mockUseBorderColor.mockReturnValue('#ccc');
  mockUseThemeColor.mockImplementation((c: any, t?: any) => {
    if (typeof c === 'string') return c;
    return c.light ?? '#000';
  });
  mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  jest.spyOn(Keyboard, 'addListener').mockImplementation(() => ({ remove: jest.fn() } as any));
  jest.spyOn(Keyboard, 'removeAllListeners').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

type Message = { id: string; text: string; timestamp: string; isFromMe: boolean; sentAt: string };

describe('ConversationScreen', () => {
  it('shows loading state when conversation is missing', () => {
    mockUseConversations.mockReturnValue({ data: { pages: [] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByText } = render(<ConversationScreen />);
    expect(getByText('common.loading common.conversations...')).toBeTruthy();
  });

  it('renders error state when messages query fails', () => {
    const conversation = { handle: 'alice', convoId: '1', avatar: 'a', displayName: 'Alice' };
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: null,
      isLoading: false,
      error: { type: 'permission', message: 'no access' },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByText } = render(<ConversationScreen />);
    expect(getByText('no access')).toBeTruthy();
    expect(getByText('common.errorLoadingMessages')).toBeTruthy();
  });

  it('sends a message and clears input', async () => {
    const conversation = { handle: 'alice', convoId: '1' };
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseSendMessage.mockReturnValue({ mutateAsync, isPending: false });

    const { getByPlaceholderText, getByText } = render(<ConversationScreen />);

    fireEvent.changeText(getByPlaceholderText('messages.typeMessage'), ' hello ');
    await act(async () => {
      fireEvent.press(getByText('arrow.up.circle.fill'));
    });
    expect(mutateAsync).toHaveBeenCalledWith({ convoId: '1', text: 'hello' });
    expect(getByPlaceholderText('messages.typeMessage').props.value).toBe('');
  });

  it('shows alert when sending fails', async () => {
    const conversation = { handle: 'alice', convoId: '1' };
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    const mutateAsync = jest.fn().mockRejectedValue(new Error('fail'));
    mockUseSendMessage.mockReturnValue({ mutateAsync, isPending: false });

    const { getByPlaceholderText, getByText } = render(<ConversationScreen />);

    fireEvent.changeText(getByPlaceholderText('messages.typeMessage'), 'test');
    await act(async () => {
      fireEvent.press(getByText('arrow.up.circle.fill'));
    });
    expect(mockShowAlert).toHaveBeenCalled();
  });

  it('loads more messages and shows footer', () => {
    const conversation = { handle: 'alice', convoId: '1' };
    const messages: Message[] = [
      { id: 'm1', text: 'hi', timestamp: '10:00', isFromMe: false, sentAt: '' },
    ];
    const fetchNextPage = jest.fn();
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages }] },
      isLoading: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: true,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByText, UNSAFE_getByType } = render(<ConversationScreen />);
    expect(getByText('common.loading common.messages...')).toBeTruthy();
    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('fetches next page when end reached', () => {
    const conversation = { handle: 'alice', convoId: '1' };
    const fetchNextPage = jest.fn();
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { UNSAFE_getByType } = render(<ConversationScreen />);
    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
  });
});

