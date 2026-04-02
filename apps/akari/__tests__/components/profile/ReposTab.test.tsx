import { render } from '@testing-library/react-native';

import { ReposTab } from '@/components/profile/ReposTab';
import { useAuthorRepos } from '@/hooks/queries/useAuthorRepos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

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
    });

    const { getByText } = render(<ReposTab handle="alice" />);
    expect(getByText('feed skeleton')).toBeTruthy();
  });

  it('renders empty state when no repos exist', () => {
    mockUseAuthorRepos.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<ReposTab handle="alice" />);
    expect(getByText('profile.noRepos')).toBeTruthy();
  });

  it('renders repos correctly', () => {
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
    });

    const { getByText } = render(<ReposTab handle="alice" />);

    expect(getByText('@knot.bsky.social/Repo One')).toBeTruthy();
    expect(getByText('A repo')).toBeTruthy();
    expect(getByText('https://example.com')).toBeTruthy();
  });
});
