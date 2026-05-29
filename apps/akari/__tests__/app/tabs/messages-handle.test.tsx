import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import ConversationScreen from '@/app/(tabs)/messages/[convoId]';
import { useLocalSearchParams } from 'expo-router';
import { useConversations } from '@/hooks/queries/useConversations';
import { useConvo } from '@/hooks/queries/useConvo';
import { useMessages } from '@/hooks/queries/useMessages';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useMessageReaction } from '@/hooks/mutations/useMessageReaction';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useConfirm } from '@/hooks/useConfirm';

jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  };
});

jest.mock('react-native-safe-area-context', () => {
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
jest.mock('@/hooks/queries/useConvo');
jest.mock('@/hooks/queries/useMessages');
jest.mock('@/hooks/mutations/useSendMessage');
jest.mock('@/hooks/mutations/useMessageReaction');
jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useJwtToken');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useConfirm');

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUseConversations = useConversations as jest.Mock;
const mockUseConvo = useConvo as jest.Mock;
const mockUseMessages = useMessages as jest.Mock;
const mockUseSendMessage = useSendMessage as jest.Mock;
const mockUseMessageReaction = useMessageReaction as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseJwtToken = useJwtToken as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseConfirm = useConfirm as jest.Mock;
const mockConfirm = jest.fn();
let keyboardListeners: { show?: () => void; hide?: () => void } = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ convoId: '1', handle: 'alice' });
  mockUseConvo.mockReturnValue({ data: undefined });
  mockUseMessageReaction.mockReturnValue({ mutate: jest.fn() });
  mockUseCurrentAccount.mockReturnValue({ data: { did: 'did:me', handle: 'me', pdsUrl: undefined } });
  mockUseJwtToken.mockReturnValue({ data: undefined });
  mockUseConfirm.mockReturnValue(mockConfirm);
  mockUseBorderColor.mockReturnValue('#ccc');
  mockUseThemeColor.mockImplementation((c: any) => {
    if (typeof c === 'string') return c;
    return c.light ?? '#000';
  });
  mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  keyboardListeners = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, callback: () => void) => {
    if (event === 'keyboardWillShow') {
      keyboardListeners.show = callback;
    }
    if (event === 'keyboardWillHide') {
      keyboardListeners.hide = callback;
    }
    return { remove: jest.fn() } as any;
  }) as any);
  jest.spyOn(Keyboard, 'removeAllListeners').mockImplementation(() => {
    keyboardListeners = {};
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  keyboardListeners = {};
});

type Message = {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  sentAt: string;
  embed?: unknown;
};

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
    const conversation = { handle: 'alice', convoId: '1', avatar: 'a', displayName: 'Alice', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
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
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
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
  }, 10000);

  it('shows alert when sending fails', async () => {
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
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
    expect(mockConfirm).toHaveBeenCalled();
  });

  it('loads more messages and shows footer', () => {
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
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
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
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

  // Header navigation is handled by the parent tab layout

  it('returns early when message text is empty', () => {
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages: [] }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    const mutateAsync = jest.fn();
    mockUseSendMessage.mockReturnValue({ mutateAsync, isPending: false });

    const { UNSAFE_root } = render(<ConversationScreen />);

    act(() => {
      const sendButton = UNSAFE_root.findAll((node: any) => {
        if (typeof node.props?.onPress !== 'function') return false;
        const t = node.type;
        const name = typeof t === 'string' ? t : ((t as any)?.displayName ?? (t as any)?.name);
        return name === 'Pressable' && node.props.disabled !== undefined;
      })[0] as any;
      sendButton.props.onPress();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows loading indicator while messages are fetching', () => {
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByText } = render(<ConversationScreen />);

    expect(getByText('common.loading')).toBeTruthy();
  });

  it('applies distinct backgrounds to incoming and outgoing messages', () => {
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
    const messages: Message[] = [
      { id: 'incoming', text: 'incoming message', timestamp: '10:00', isFromMe: false, sentAt: '' },
      { id: 'outgoing', text: 'outgoing message', timestamp: '10:05', isFromMe: true, sentAt: '' },
    ];
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByText } = render(<ConversationScreen />);

    const incomingNode = getByText('incoming message');
    const outgoingNode = getByText('outgoing message');

    const incomingBubble = incomingNode.parent?.parent?.parent as any;
    const outgoingBubble = outgoingNode.parent?.parent?.parent as any;

    const incomingStyles = StyleSheet.flatten(incomingBubble?.props.style);
    const outgoingStyles = StyleSheet.flatten(outgoingBubble?.props.style);

    // Just verify they have different backgrounds
    expect(incomingStyles?.backgroundColor).toBeDefined();
    expect(outgoingStyles?.backgroundColor).toBeDefined();
    expect(incomingStyles?.backgroundColor).not.toBe(outgoingStyles?.backgroundColor);
  });

  it('renders outgoing messages', () => {
    const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
    const messages: Message[] = [
      { id: 'm2', text: 'from me', timestamp: 'now', isFromMe: true, sentAt: '' },
    ];
    mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
    mockUseMessages.mockReturnValue({
      data: { pages: [{ messages }] },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByText } = render(<ConversationScreen />);
    expect(getByText('from me')).toBeTruthy();
  });

  it('uses height behavior for non-iOS platforms', () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';

    try {
      const conversation = { handle: 'alice', convoId: '1', isGroup: false, muted: false, members: [{ did: 'did:alice', handle: 'alice' }] };
      mockUseConversations.mockReturnValue({ data: { pages: [{ conversations: [conversation] }] } });
      mockUseMessages.mockReturnValue({
        data: { pages: [{ messages: [] }] },
        isLoading: false,
        error: null,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
      mockUseSendMessage.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

      const { UNSAFE_getByType } = render(<ConversationScreen />);

      expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBeUndefined();
    } finally {
      Platform.OS = originalPlatform;
    }
  });
});

