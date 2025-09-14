import { render } from '@testing-library/react-native';

import type { BlueskyEmbed, BlueskyRecord } from '@/bluesky-api';
import { RecordEmbed } from '@/components/RecordEmbed';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

// Mock the hooks and components that RecordEmbed depends on
jest.mock('@/hooks/queries/useProfile');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/RichTextWithFacets');
jest.mock('@/components/ExternalEmbed');
jest.mock('@/components/GifEmbed');
jest.mock('@/components/VideoEmbed');
jest.mock('@/components/YouTubeEmbed');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock the useProfile hook
const mockUseProfile = useProfile as jest.Mock;
mockUseProfile.mockReturnValue({
  data: null,
  isLoading: false,
  error: null,
});

// Mock the useThemeColor hook
const mockUseThemeColor = useThemeColor as jest.Mock;
mockUseThemeColor.mockReturnValue('#000000');

// Mock the useTranslation hook
const mockUseTranslation = useTranslation as jest.Mock;
mockUseTranslation.mockReturnValue({
  t: (key: string) => key,
});

describe('RecordEmbed Component', () => {
  const createMockEmbed = (overrides: Partial<BlueskyEmbed & { record: BlueskyRecord }> = {}) => ({
    $type: 'app.bsky.embed.record#view',
    record: {
      uri: 'at://did:plc:test/app.bsky.feed.post/123',
      cid: 'test-cid',
      author: {
        did: 'did:plc:test',
        handle: 'testuser.bsky.social',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      },
      value: {
        text: 'This is a test post',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      indexedAt: '2024-01-01T00:00:00.000Z',
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a regular post embed', () => {
    const embed = createMockEmbed();

    const { getByText } = render(<RecordEmbed embed={embed} />);

    expect(getByText('Test User')).toBeTruthy();
    expect(getByText('@testuser.bsky.social')).toBeTruthy();
  });

  it('should render a quote post embed', () => {
    const embed = createMockEmbed({
      $type: 'app.bsky.embed.recordWithMedia#view',
      record: {
        uri: 'at://did:plc:quoter/app.bsky.feed.post/456',
        cid: 'test-cid-2',
        author: {
          did: 'did:plc:quoter',
          handle: 'quoter.bsky.social',
          displayName: 'Quote User',
          avatar: 'https://example.com/quoter-avatar.jpg',
        },
        record: {
          $type: 'app.bsky.embed.record#viewRecord',
          author: {
            did: 'did:plc:original',
            handle: 'original.bsky.social',
            displayName: 'Original User',
            avatar: 'https://example.com/original-avatar.jpg',
          },
          value: {
            text: 'This is the original post being quoted',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          uri: 'at://did:plc:original/app.bsky.feed.post/789',
          cid: 'original-cid',
          indexedAt: '2024-01-01T00:00:00.000Z',
          likeCount: 5,
          replyCount: 2,
          repostCount: 1,
        },
        value: {
          text: 'This is a quote post',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      },
    });

    const { getByText } = render(<RecordEmbed embed={embed} />);

    // The component should display the author of the quoted post (the original post author)
    // based on the getAuthorInfo() logic in the component
    expect(getByText('Original User')).toBeTruthy();
    expect(getByText('@original.bsky.social')).toBeTruthy();
  });

  it('should render a blocked post embed', () => {
    const embed = createMockEmbed({
      record: {
        uri: 'at://did:plc:blocked/app.bsky.feed.post/999',
        cid: 'blocked-cid',
        $type: 'app.bsky.embed.record#viewBlocked',
        author: {
          did: 'did:plc:blocked',
          handle: 'blocked.bsky.social',
          displayName: 'Blocked User',
          avatar: 'https://example.com/blocked-avatar.jpg',
          viewer: {
            blockedBy: true,
          },
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      },
    });

    const { getByText } = render(<RecordEmbed embed={embed} />);

    expect(getByText('Blocked User')).toBeTruthy();
    expect(getByText('@blocked.bsky.social')).toBeTruthy();
  });

  it('should handle missing author information gracefully', () => {
    const embed = createMockEmbed({
      record: {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        cid: 'test-cid',
        author: {
          did: 'did:plc:test',
          handle: 'testuser.bsky.social',
          displayName: '',
          avatar: '',
        },
        value: {
          text: 'Post without display name',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      },
    });

    const { getByText } = render(<RecordEmbed embed={embed} />);

    expect(getByText('@testuser.bsky.social')).toBeTruthy();
  });

  it('should handle missing text content gracefully', () => {
    const embed = createMockEmbed({
      record: {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        cid: 'test-cid',
        author: {
          did: 'did:plc:test',
          handle: 'testuser.bsky.social',
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
        value: {
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      },
    });

    const { getByText } = render(<RecordEmbed embed={embed} />);

    expect(getByText('Test User')).toBeTruthy();
    expect(getByText('@testuser.bsky.social')).toBeTruthy();
  });

  it('should be touchable', () => {
    const embed = createMockEmbed();

    const { getByTestId } = render(<RecordEmbed embed={embed} />);

    // The component should render a TouchableOpacity
    const touchable = getByTestId('record-embed-touchable');
    expect(touchable).toBeTruthy();
  });
});
