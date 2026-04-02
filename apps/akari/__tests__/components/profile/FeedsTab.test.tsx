import { fireEvent, render } from '@testing-library/react-native';

import { FeedsTab } from '@/components/profile/FeedsTab';
import { useAuthorFeeds } from '@/hooks/queries/useAuthorFeeds';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/queries/useAuthorFeeds');

jest.mock('@/hooks/useTranslation');

jest.mock('@/hooks/useThemeColor');

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: () => <Text>feed skeleton</Text> };
});

jest.mock('@/components/ui/IconSymbol', () => {
  const { Text } = require('react-native');
  return { IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text> };
});

jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

const mockUseAuthorFeeds = useAuthorFeeds as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('FeedsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
    mockUseThemeColor.mockImplementation((colors) =>
      typeof colors === 'string' ? colors : colors.light,
    );
  });

  it('shows skeleton while loading', () => {
    mockUseAuthorFeeds.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getByText } = render(<FeedsTab handle="alice" />);
    expect(getByText('feed skeleton')).toBeTruthy();
  });

  it('shows empty state when no feeds', () => {
    mockUseAuthorFeeds.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<FeedsTab handle="alice" />);
    expect(getByText('profile.noFeeds')).toBeTruthy();
  });

  it('renders feeds and handles pin and interactions', () => {
    const feeds = [
      {
        uri: 'feed1',
        displayName: 'Feed One',
        creator: { handle: 'alice' },
        description: 'desc',
        likeCount: 1,
        acceptsInteractions: true,
      },
      {
        uri: 'feed2',
        displayName: 'Feed Two',
        creator: { handle: 'bob' },
        likeCount: 0,
        acceptsInteractions: false,
      },
    ];

    mockUseAuthorFeeds.mockReturnValue({
      data: feeds,
      isLoading: false,
    });

    const { getByText, getAllByText } = render(
      <FeedsTab handle="alice" />,
    );

    expect(getByText('desc')).toBeTruthy();
    expect(getByText('ui.interactive')).toBeTruthy();

    // Pin is a placeholder (TODO stub), verify it doesn't crash
    fireEvent.press(getAllByText('pin')[0]);
  });
});
