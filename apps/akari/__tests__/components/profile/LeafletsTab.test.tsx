import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { LeafletsTab } from '@/components/profile/LeafletsTab';
import { useLeafletDocuments } from '@/hooks/queries/useLeafletDocuments';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

jest.mock('@/hooks/queries/useLeafletDocuments');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: () => <Text>leaflets skeleton</Text> };
});
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

const mockUseLeafletDocuments = useLeafletDocuments as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('LeafletsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((palette) => palette.light);
    mockUseTranslation.mockReturnValue({
      t: (key: string) =>
        ({
          'profile.noLeaflets': 'profile.noLeaflets',
          'profile.expandLeaflet': 'profile.expandLeaflet',
          'profile.collapseLeaflet': 'profile.collapseLeaflet',
          'common.loading': 'common.loading',
        }[key] ?? key),
    });
  });

  it('renders loading skeleton while fetching', () => {
    mockUseLeafletDocuments.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<LeafletsTab did="did:example" />);
    expect(getByText('leaflets skeleton')).toBeTruthy();
  });

  it('shows empty state when no documents', () => {
    mockUseLeafletDocuments.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<LeafletsTab did="did:example" />);
    expect(getByText('profile.noLeaflets')).toBeTruthy();
  });

  it('renders documents and loads additional pages', () => {
    const fetchNextPage = jest.fn();
    const document = {
      uri: 'at://did:example/pub.leaflet.document/doc1',
      cid: 'cid1',
      value: {
        title: 'Leaflet One',
        description: 'Summary text',
        publishedAt: new Date().toISOString(),
        pages: [
          {
            blocks: [
              {
                block: {
                  $type: 'pub.leaflet.blocks.text',
                  plaintext: 'Full content',
                },
              },
            ],
          },
        ],
      },
    };

    mockUseLeafletDocuments.mockReturnValue({
      data: [document],
      isLoading: false,
      isError: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByText, queryByText, UNSAFE_getByType } = render(<LeafletsTab did="did:example" />);

    expect(getByText('Leaflet One')).toBeTruthy();
    expect(getByText('Summary text')).toBeTruthy();
    expect(queryByText('Full content')).toBeNull();

    fireEvent.press(getByText('profile.expandLeaflet'));
    expect(getByText('Full content')).toBeTruthy();

    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer when fetching next page', () => {
    mockUseLeafletDocuments.mockReturnValue({
      data: [
        {
          uri: 'at://did:example/pub.leaflet.document/doc1',
          cid: 'cid1',
          value: { description: 'Summary' },
        },
      ],
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText } = render(<LeafletsTab did="did:example" />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('falls back to empty state when the query errors', () => {
    mockUseLeafletDocuments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<LeafletsTab did="did:example" />);
    expect(getByText('profile.noLeaflets')).toBeTruthy();
  });
});
