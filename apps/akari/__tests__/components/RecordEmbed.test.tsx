import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import type { BlueskyEmbed, BlueskyRecord } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { RecordEmbed } from '@/components/RecordEmbed';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

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
  usePathname: jest.fn(() => '/index'),
}));

const mockExternalEmbed = ExternalEmbed as jest.Mock;
const mockGifEmbed = GifEmbed as jest.Mock;
const mockVideoEmbed = VideoEmbed as jest.Mock;
const mockYouTubeEmbed = YouTubeEmbed as jest.Mock;
const mockRichTextWithFacets = RichTextWithFacets as jest.Mock;

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

  it('should navigate to post and author when pressed', () => {
    const embed = createMockEmbed();

    const { getByTestId, getByText } = render(<RecordEmbed embed={embed} />);

    fireEvent.press(getByTestId('record-embed-touchable'));
    // The navigation now uses the new useNavigateToPost hook which handles tab-specific routing
    // We can't easily test the exact path since it depends on the current pathname
    expect(router.push).toHaveBeenCalled();

    fireEvent.press(getByText('Test User'));
    // The component now uses useNavigateToProfile hook which navigates to tab-specific profile route
    expect(router.push).toHaveBeenCalledWith(`/(tabs)/index/user-profile/${encodeURIComponent(embed.record.author.handle)}`);
  });

  it('should render images and handle load events', () => {
    const embed = createMockEmbed({
      record: {
        ...createMockEmbed().record,
        embed: {
          images: [
            { fullsize: 'https://example.com/img.jpg', alt: 'img', image: { mimeType: 'image/jpeg' } },
            { fullsize: 'https://example.com/vid.mp4', image: { mimeType: 'video/mp4' } },
          ],
        },
      },
    });

    const { UNSAFE_getAllByType } = render(<RecordEmbed embed={embed} />);
    const images = UNSAFE_getAllByType(Image);

    fireEvent(images[1], 'load', { source: { width: 100, height: 50 } });
    fireEvent(images[1], 'load', { source: { width: 0, height: 0 } });
  });

  it('should render images from embeds array', () => {
    const embed = createMockEmbed({
      record: {
        ...createMockEmbed().record,
        embeds: [
          {
            images: [{ fullsize: 'https://example.com/alt-img.jpg', alt: 'alt' }],
          },
        ],
      },
    });

    const { UNSAFE_getAllByType } = render(<RecordEmbed embed={embed} />);
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(1);
  });

  it('should render a GIF, YouTube, external, and video embeds', () => {
    const baseRecord = createMockEmbed().record;

    render(
      <RecordEmbed
        embed={createMockEmbed({
          record: {
            ...baseRecord,
            embed: { external: { uri: 'https://example.com/anim.gif' } },
          },
        })}
      />,
    );
    expect(mockGifEmbed).toHaveBeenCalled();

    render(
      <RecordEmbed
        embed={createMockEmbed({
          record: {
            ...baseRecord,
            embed: { external: { uri: 'https://youtube.com/watch?v=1' } },
          },
        })}
      />,
    );
    expect(mockYouTubeEmbed).toHaveBeenCalled();

    render(
      <RecordEmbed
        embed={createMockEmbed({
          record: {
            ...baseRecord,
            embed: { external: { uri: 'https://example.com' } },
          },
        })}
      />,
    );
    expect(mockExternalEmbed).toHaveBeenCalled();

    render(
      <RecordEmbed
        embed={createMockEmbed({
          record: {
            ...baseRecord,
            embed: {
              $type: 'app.bsky.embed.video#view',
              playlist: 'https://video.example/playlist.m3u8',
              thumbnail: 'https://video.example/thumb.jpg',
              alt: 'video',
              aspectRatio: { width: 1, height: 1 },
            },
          },
        })}
      />,
    );
    expect(mockVideoEmbed).toHaveBeenCalled();
  });

  it('should render video from embeds array', () => {
    const embed = createMockEmbed({
      record: {
        ...createMockEmbed().record,
        embeds: [
          {
            $type: 'app.bsky.embed.video#view',
            playlist: 'https://video.example/playlist.m3u8',
            thumbnail: 'https://video.example/thumb.jpg',
            alt: 'video',
            aspectRatio: { width: 1, height: 1 },
          },
        ],
      },
    });

    render(<RecordEmbed embed={embed} />);
    expect(mockVideoEmbed).toHaveBeenCalled();
  });

  it('should handle blocking message scenarios', () => {
    const blocked = (viewer: any) =>
      createMockEmbed({
        record: {
          uri: 'at://did:plc:blocked/app.bsky.feed.post/999',
          cid: 'blocked-cid',
          record: {
            $type: 'app.bsky.embed.record#viewBlocked',
            author: { did: 'did:plc:blocked', viewer },
          },
        },
      });

    const { getByText: getByTextMutual } = render(<RecordEmbed embed={blocked({ blockedBy: true, blocking: true })} />);
    expect(getByTextMutual('profile.mutualBlock')).toBeTruthy();

    const { getByText: getByTextBlockedBy } = render(<RecordEmbed embed={blocked({ blockedBy: true })} />);
    expect(getByTextBlockedBy('profile.youAreBlockedByUser')).toBeTruthy();

    const { getByText: getByTextBlocking } = render(<RecordEmbed embed={blocked({ blocking: true })} />);
    expect(getByTextBlocking('profile.youHaveBlockedUser')).toBeTruthy();
  });

  it('should use profile data for blocked authors', () => {
    mockUseProfile.mockReturnValueOnce({
      data: { handle: 'profile.user', displayName: 'Profile User', avatar: 'https://avatar.com/p.jpg' },
      isLoading: false,
      error: null,
    });

    const embed = createMockEmbed({
      record: {
        uri: 'at://did:plc:blocked/app.bsky.feed.post/999',
        cid: 'blocked-cid',
        record: {
          $type: 'app.bsky.embed.record#viewBlocked',
          author: { did: 'did:plc:blocked', viewer: { blockedBy: true, blocking: true } },
        },
      },
    });

    const { getByText } = render(<RecordEmbed embed={embed} />);
    expect(getByText('Profile User')).toBeTruthy();
  });

  it('should extract nested quoted text', () => {
    const embed = createMockEmbed({
      record: {
        ...createMockEmbed().record,
        record: {
          record: {
            value: { text: 'Nested text' },
          },
        },
      },
    });

    render(<RecordEmbed embed={embed} />);
    expect(mockRichTextWithFacets).toHaveBeenCalledWith(expect.objectContaining({ text: 'Nested text' }), undefined);
  });
});
