import { render } from '@testing-library/react-native';

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
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

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
    });

    const { getByText } = render(<StarterpacksTab handle="alice" />);
    expect(getByText('feed skeleton')).toBeTruthy();
  });

  it('renders empty state when no starterpacks exist', () => {
    mockUseAuthorStarterpacks.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<StarterpacksTab handle="alice" />);
    expect(getByText('profile.noStarterpacks')).toBeTruthy();
  });

  it('renders starterpacks correctly', () => {
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
    });

    const { getByText } = render(
      <StarterpacksTab handle="alice" />,
    );

    expect(getByText('Pack One')).toBeTruthy();
  });
});
