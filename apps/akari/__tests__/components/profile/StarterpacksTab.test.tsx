import { act, render } from '@testing-library/react-native';
import { FlatList, Text } from 'react-native';

import { StarterpacksTab } from '@/components/profile/StarterpacksTab';
import { useAuthorStarterpacks } from '@/hooks/queries/useAuthorStarterpacks';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/queries/useAuthorStarterpacks');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: () => <Text>feed skeleton</Text> };
});

const mockUseAuthorStarterpacks = useAuthorStarterpacks as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('StarterpacksTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors) => colors.light);
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('shows loading skeleton while fetching data', () => {
    mockUseAuthorStarterpacks.mockReturnValue({
      data: [],
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<StarterpacksTab handle="alice" />);
    expect(getByText('feed skeleton')).toBeTruthy();
  });

  it('renders empty state when no starterpacks exist', () => {
    mockUseAuthorStarterpacks.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<StarterpacksTab handle="alice" />);
    expect(getByText('profile.noStarterpacks')).toBeTruthy();
  });

  it('renders starterpacks and loads more on end reach', () => {
    const fetchNextPage = jest.fn();
    const starterpack = {
      uri: 'at://pack/1',
      cid: 'cid1',
      record: {
        $type: 'app.bsky.graph.starterpack',
        createdAt: '',
        description: 'cool pack',
        feeds: [],
        list: '',
        name: 'Pack One',
        updatedAt: '',
      },
      creator: { handle: 'alice' },
      joinedWeekCount: 2,
      joinedAllTimeCount: 5,
      labels: [],
      indexedAt: '',
    } as any;

    mockUseAuthorStarterpacks.mockReturnValue({
      data: [starterpack],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByText, UNSAFE_getByType, queryByText } = render(
      <StarterpacksTab handle="alice" />,
    );

    expect(getByText('Pack One')).toBeTruthy();
    expect(queryByText('common.loading')).toBeNull();

    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer when fetching next page', () => {
    mockUseAuthorStarterpacks.mockReturnValue({
      data: [
        {
          uri: 'at://pack/1',
          cid: 'cid1',
          record: {
            $type: 'app.bsky.graph.starterpack',
            createdAt: '',
            description: 'cool pack',
            feeds: [],
            list: '',
            name: 'Pack One',
            updatedAt: '',
          },
          creator: { handle: 'alice' },
          joinedWeekCount: 2,
          joinedAllTimeCount: 5,
          labels: [],
          indexedAt: '',
        },
      ],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText } = render(<StarterpacksTab handle="alice" />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('does not fetch when no more starterpacks', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorStarterpacks.mockReturnValue({
      data: [
        {
          uri: 'at://pack/1',
          cid: 'cid1',
          record: {
            $type: 'app.bsky.graph.starterpack',
            createdAt: '',
            description: 'cool pack',
            feeds: [],
            list: '',
            name: 'Pack One',
            updatedAt: '',
          },
          creator: { handle: 'alice' },
          joinedWeekCount: 0,
          joinedAllTimeCount: 5,
          labels: [],
          indexedAt: '',
        },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<StarterpacksTab handle="alice" />);
    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

