import { act, render } from '@testing-library/react-native';

import { ReposTab } from '@/components/profile/ReposTab';
import { useAuthorRepos } from '@/hooks/queries/useAuthorRepos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

jest.mock('@/hooks/queries/useAuthorRepos');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: () => <Text>feed skeleton</Text> };
});
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

const mockUseAuthorRepos = useAuthorRepos as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('ReposTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors, colorName) => {
      return colors.light ?? `mock-${colorName}`;
    });
    mockUseTranslation.mockReturnValue({ t: (key: string) => key, locale: 'en-US' });
  });

  it('shows loading skeleton while fetching data', () => {
    mockUseAuthorRepos.mockReturnValue({
      data: [],
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<ReposTab handle="alice" />);
    expect(getByText('feed skeleton')).toBeTruthy();
  });

  it('renders empty state when no repos exist', () => {
    mockUseAuthorRepos.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<ReposTab handle="alice" />);
    expect(getByText('profile.noRepos')).toBeTruthy();
  });

  it('renders repos and loads more on end reach', () => {
    const fetchNextPage = jest.fn();
    const repo = {
      uri: 'at://repo/1',
      cid: 'cid1',
      value: {
        $type: 'sh.tangled.repo',
        name: 'Repo One',
        knot: 'knot.bsky.social',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'A repo',
        spindle: 'ci-runner',
        source: 'https://example.com',
      },
    } as any;

    mockUseAuthorRepos.mockReturnValue({
      data: [repo],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByText, UNSAFE_getByType, queryByText } = render(<ReposTab handle="alice" />);

    expect(getByText('@knot.bsky.social/Repo One')).toBeTruthy();
    expect(getByText('A repo')).toBeTruthy();
    expect(getByText('https://example.com')).toBeTruthy();
    expect(queryByText('common.loading')).toBeNull();

    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer when fetching next page', () => {
    mockUseAuthorRepos.mockReturnValue({
      data: [
        {
          uri: 'at://repo/1',
          cid: 'cid1',
          value: {
            $type: 'sh.tangled.repo',
            name: 'Repo One',
            knot: 'knot.bsky.social',
            createdAt: '2024-01-01T00:00:00Z',
          },
        },
      ],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText } = render(<ReposTab handle="alice" />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('does not fetch when no more repos', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorRepos.mockReturnValue({
      data: [
        {
          uri: 'at://repo/1',
          cid: 'cid1',
          value: {
            $type: 'sh.tangled.repo',
            name: 'Repo One',
            knot: 'knot.bsky.social',
            createdAt: '2024-01-01T00:00:00Z',
          },
        },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<ReposTab handle="alice" />);
    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
