import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { FlatList, Keyboard, Text, TouchableOpacity, View } from 'react-native';

import SearchScreen from '@/app/(tabs)/search';
import { useLocalSearchParams } from 'expo-router';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useSearch } from '@/hooks/queries/useSearch';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsive } from '@/hooks/useResponsive';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/components/Labels', () => {
  const { View } = require('react-native');
  return { Labels: () => <View /> };
});

jest.mock('@/components/PostCard', () => {
  const { Text } = require('react-native');
  return {
    PostCard: ({ post }: { post: { text: string } }) => <Text>{post.text}</Text>,
  };
});

jest.mock('@/components/SearchTabs', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    SearchTabs: ({ onTabChange }: { onTabChange: (t: string) => void }) => (
      <View>
        <TouchableOpacity onPress={() => onTabChange('all')}><Text>All</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('users')}><Text>Users</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('posts')}><Text>Posts</Text></TouchableOpacity>
      </View>
    ),
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

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { SearchResultSkeleton: () => <Text>Skeleton</Text> };
});

jest.mock('@/hooks/mutations/useSetSelectedFeed');
jest.mock('@/hooks/queries/useFeedGenerators');
jest.mock('@/hooks/queries/usePreferences');
jest.mock('@/hooks/queries/useSearch');
jest.mock('@/hooks/queries/useTrendingTopics');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useResponsive');
jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: { register: jest.fn() },
}));

const mockUseLocalSearchParams = useLocalSearchParams as unknown as jest.Mock;
const mockUsePreferences = usePreferences as jest.Mock;
const mockUseTrendingTopics = useTrendingTopics as jest.Mock;
const mockUseFeedGenerators = useFeedGenerators as jest.Mock;
const mockUseSearch = useSearch as jest.Mock;
const mockUseSetSelectedFeed = useSetSelectedFeed as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockTabRegister = tabScrollRegistry.register as jest.Mock;

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((c: any) => (typeof c === 'string' ? c : c.light ?? '#000'));
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
    mockUsePreferences.mockReturnValue({
      data: { preferences: [] },
      isLoading: false,
      error: null,
    });
    mockUseTrendingTopics.mockReturnValue({
      data: { topics: [], suggested: [] },
      isLoading: false,
      error: null,
    });
    mockUseFeedGenerators.mockReturnValue({ data: { feeds: [] }, isLoading: false });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
  });

  it('trims query and triggers search', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseSearch.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByPlaceholderText, getByText } = render(<SearchScreen />);
    fireEvent.changeText(getByPlaceholderText('search.searchInputPlaceholder'), ' hello ');
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    fireEvent.press(getByText('common.search'));
    await waitFor(() => {
      expect(mockUseSearch).toHaveBeenLastCalledWith('hello', 'all', 20);
    });
    expect(dismissSpy).toHaveBeenCalled();
  });

  it('clears the current search from the input button', async () => {
    mockUseLocalSearchParams.mockReturnValue({ query: 'foo' });
    const hookState = {
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    };
    const searchResults = {
      pages: [
        {
          results: [
            { type: 'profile', data: { handle: 'alice', displayName: 'Alice' } },
          ],
        },
      ],
    };
    const emptyResults = { pages: [] };

    mockUseSearch.mockImplementation((queryValue?: string) => ({
      ...hookState,
      data: queryValue ? searchResults : emptyResults,
    }));

    const { getByPlaceholderText, getByLabelText, queryByLabelText, getByText, queryByText } = render(
      <SearchScreen />,
    );

    expect(getByPlaceholderText('search.searchInputPlaceholder').props.value).toBe('foo');
    expect(getByText('Alice')).toBeTruthy();

    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    fireEvent.press(getByLabelText('search.clearSearch'));

    await waitFor(() => {
      expect(mockUseSearch).toHaveBeenLastCalledWith(undefined, 'all', 20);
    });
    await waitFor(() => {
      expect(getByPlaceholderText('search.searchInputPlaceholder').props.value).toBe('');
    });
    await waitFor(() => {
      expect(queryByText('Alice')).toBeNull();
    });
    expect(queryByLabelText('search.clearSearch')).toBeNull();
    expect(dismissSpy).toHaveBeenCalled();
  });

  it('filters results by selected tab', () => {
    mockUseLocalSearchParams.mockReturnValue({ query: 'foo' });
    const searchData = {
      pages: [
        {
          results: [
            { type: 'profile', data: { handle: 'alice', displayName: 'Alice' } },
            {
              type: 'post',
              data: {
                uri: '1',
                record: { text: 'Hello' },
                author: { handle: 'bob', displayName: 'Bob' },
                indexedAt: new Date().toISOString(),
              },
            },
          ],
        },
      ],
    };
    mockUseSearch.mockReturnValue({
      data: searchData,
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText, queryByText } = render(<SearchScreen />);
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Hello')).toBeTruthy();
    fireEvent.press(getByText('Posts'));
    expect(queryByText('Alice')).toBeNull();
    expect(getByText('Hello')).toBeTruthy();
    fireEvent.press(getByText('Users'));
    expect(getByText('Alice')).toBeTruthy();
    expect(queryByText('Hello')).toBeNull();
  });

  it('resets the search when the search tab is pressed again', async () => {
    mockUseLocalSearchParams.mockReturnValue({ query: 'foo' });
    const hookState = {
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    };
    const searchResults = {
      pages: [
        {
          results: [
            { type: 'profile', data: { handle: 'alice', displayName: 'Alice' } },
          ],
        },
      ],
    };
    const emptyResults = { pages: [] };

    mockUseSearch.mockImplementation((queryValue?: string) => ({
      ...hookState,
      data: queryValue ? searchResults : emptyResults,
    }));

    const { getByPlaceholderText } = render(<SearchScreen />);
    expect(mockTabRegister).toHaveBeenCalledWith('search', expect.any(Function));
    const [, registeredHandler] = mockTabRegister.mock.calls[0];
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});

    act(() => {
      registeredHandler();
    });

    await waitFor(() => {
      expect(mockUseSearch).toHaveBeenLastCalledWith(undefined, 'all', 20);
    });
    await waitFor(() => {
      expect(getByPlaceholderText('search.searchInputPlaceholder').props.value).toBe('');
    });
    expect(dismissSpy).toHaveBeenCalled();
  });

  it('loads more results and refreshes', () => {
    mockUseLocalSearchParams.mockReturnValue({ query: 'foo' });
    const fetchNextPage = jest.fn();
    const refetch = jest.fn();
    mockUseSearch.mockReturnValue({
      data: { pages: [{ results: [] }] },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: true,
      fetchNextPage,
      isFetchingNextPage: false,
      refetch,
      isRefetching: false,
    });

    const { UNSAFE_getByType } = render(<SearchScreen />);
    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
    act(() => {
      UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalled();
  });
});

