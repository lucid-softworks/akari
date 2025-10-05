
const actualReact = jest.requireActual('react');

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  const useState = jest.fn(actual.useState);

  return {
    ...actual,
    useState,
  };
});

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';
import { useLibreTranslateLanguages } from '@/hooks/queries/useLibreTranslateLanguages';
import { useLiveNow } from '@/hooks/queries/useLiveNow';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { router } from 'expo-router';

jest.mock('@/hooks/mutations/useLikePost');
jest.mock('@/hooks/mutations/usePostTranslation');
jest.mock('@/hooks/queries/useLibreTranslateLanguages');
jest.mock('@/hooks/queries/useLiveNow');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');

  const MockModal = ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? <>{children}</> : null;

  return {
    __esModule: true,
    default: MockModal,
    Modal: MockModal,
  };
});

// Mock heavy child components that are not under test
jest.mock('@/components/ExternalEmbed', () => ({ ExternalEmbed: jest.fn(() => null) }));
jest.mock('@/components/GifEmbed', () => ({ GifEmbed: jest.fn(() => null) }));
jest.mock('@/components/ImageViewer', () => ({ ImageViewer: jest.fn(() => null) }));
jest.mock('@/components/Labels', () => ({ Labels: jest.fn(() => null) }));
jest.mock('@/components/PostComposer', () => ({ PostComposer: jest.fn(() => null) }));
jest.mock('@/components/RecordEmbed', () => ({ RecordEmbed: jest.fn(() => null) }));
jest.mock('@/components/RichTextWithFacets', () => ({ RichTextWithFacets: jest.fn(() => null) }));
jest.mock('@/components/VideoEmbed', () => ({ VideoEmbed: jest.fn(() => null) }));
jest.mock('@/components/YouTubeEmbed', () => ({ YouTubeEmbed: jest.fn(() => null) }));
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: jest.fn(() => null) }));

const ImageMock = require('expo-image').Image as jest.Mock;
const ExternalEmbedMock = require('@/components/ExternalEmbed').ExternalEmbed as jest.Mock;
const GifEmbedMock = require('@/components/GifEmbed').GifEmbed as jest.Mock;
const ImageViewerMock = require('@/components/ImageViewer').ImageViewer as jest.Mock;
const PostComposerMock = require('@/components/PostComposer').PostComposer as jest.Mock;
const RecordEmbedMock = require('@/components/RecordEmbed').RecordEmbed as jest.Mock;
const VideoEmbedMock = require('@/components/VideoEmbed').VideoEmbed as jest.Mock;
const YouTubeEmbedMock = require('@/components/YouTubeEmbed').YouTubeEmbed as jest.Mock;

type Post = {
  id: string;
  text?: string;
  author: { did: string; handle: string; displayName?: string; avatar?: string };
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  uri?: string;
  cid?: string;
  viewer?: { like?: string };
  embed?: any;
  embeds?: any[];
  labels?: any;
  facets?: any;
};

describe('PostCard', () => {
  const mockUseLikePost = useLikePost as jest.Mock;
  const mockUsePostTranslation = usePostTranslation as jest.Mock;
  const mockUseLibreTranslateLanguages = useLibreTranslateLanguages as jest.Mock;
  const mockUseLiveNow = useLiveNow as jest.Mock;
  const mockUseThemeColor = useThemeColor as jest.Mock;
  const mockUseTranslation = useTranslation as jest.Mock;
  let mutateAsyncMock: jest.Mock;

  const basePost: Post = {
    id: '1',
    text: 'Hello world',
    author: { did: 'did:plc:alice', handle: 'alice', displayName: 'Alice' },
    createdAt: '2024-01-01',
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    uri: 'at://post/1',
    cid: 'cid1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({
      t: (k: string) => k,
      currentLocale: 'en',
      changeLanguage: jest.fn(),
      availableLocales: ['en'],
    });
    mockUseLiveNow.mockReturnValue({ data: [], isLoading: false });
    mutateAsyncMock = jest
      .fn()
      .mockImplementation(async ({ targetLanguage }: { targetLanguage: string }) => ({
        translatedText: `translated-${targetLanguage}`,
      }));
    mockUsePostTranslation.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      reset: jest.fn(),
    });
    mockUseLibreTranslateLanguages.mockReturnValue({
      data: {
        languages: [
          { code: 'en', name: 'English', targets: [] },
          { code: 'es', name: 'Spanish', targets: [] },
        ],
        isFallback: false,
      },
      isLoading: false,
    });
  });

  it('navigates to profile when handle pressed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const { getByRole } = render(<PostCard post={basePost} />);
    const button = getByRole('button', { name: 'View profile of Alice' });
    fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/profile/alice');
  });

  it('navigates to profile when avatar pressed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const { getByRole } = render(<PostCard post={basePost} />);
    const avatarButton = getByRole('button', { name: "View Alice's profile via avatar" });
    fireEvent.press(avatarButton);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/profile/alice');
  });

  it('likes a post when not previously liked', () => {
    const mutate = jest.fn();
    mockUseLikePost.mockReturnValue({ mutate });
    const { getByRole } = render(<PostCard post={basePost} />);
    fireEvent.press(getByRole('button', { name: /like post by Alice/i }));
    expect(mutate).toHaveBeenCalledWith({
      postUri: 'at://post/1',
      postCid: 'cid1',
      action: 'like',
    });
  });

  it('unlikes a post when already liked', () => {
    const mutate = jest.fn();
    mockUseLikePost.mockReturnValue({ mutate });
    const likedPost: Post = { ...basePost, viewer: { like: 'like1' } };
    const { getByRole } = render(<PostCard post={likedPost} />);
    fireEvent.press(getByRole('button', { name: /unlike post by Alice/i }));
    expect(mutate).toHaveBeenCalledWith({
      postUri: 'at://post/1',
      likeUri: 'like1',
      action: 'unlike',
    });
  });

  it('does not like a post without uri or cid', () => {
    const mutate = jest.fn();
    mockUseLikePost.mockReturnValue({ mutate });
    const post: Post = { ...basePost, uri: undefined, cid: undefined };
    const { getByRole } = render(<PostCard post={post} />);
    fireEvent.press(getByRole('button', { name: /like post by Alice/i }));
    expect(mutate).not.toHaveBeenCalled();
  });

  describe('translation actions', () => {
    const openMenuByDefault = () => {
      const reactModule = jest.requireMock('react') as typeof actualReact & { useState: jest.Mock };
      const useStateMock = reactModule.useState as jest.Mock;
      const actualUseState = actualReact.useState;
      let callCount = 0;

      useStateMock.mockImplementation(<T,>(initialState: T) => {
        callCount += 1;

        if (callCount === 4) {
          return actualUseState(true as unknown as T);
        }

        return actualUseState(initialState);
      });

      return () => {
        useStateMock.mockImplementation(actualUseState);
        useStateMock.mockClear();
      };
    };

    it('shows translation panel and loads translation when translate action selected', async () => {
      const restoreUseState = openMenuByDefault();

      try {
        mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
        const { getByRole, getByText } = render(<PostCard post={basePost} />);

        const translateOption = await waitFor(() =>
          getByRole('menuitem', { name: 'post.actions.translate' }),
        );
        expect(translateOption.props.accessibilityState?.disabled).toBe(false);

        fireEvent.press(translateOption);

        await waitFor(() => {
          expect(mutateAsyncMock).toHaveBeenCalledWith({ text: 'Hello world', targetLanguage: 'en' });
        });

        await waitFor(() => {
          expect(getByText('translated-en')).toBeTruthy();
        });
        expect(getByText('post.translation.title')).toBeTruthy();
      } finally {
        restoreUseState();
      }
    });

    it('allows selecting a different language for translation', async () => {
      const restoreUseState = openMenuByDefault();

      try {
        mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
        const { getByRole, getByText } = render(<PostCard post={basePost} />);

        const translateOption = await waitFor(() =>
          getByRole('menuitem', { name: 'post.actions.translate' }),
        );
        fireEvent.press(translateOption);

        await waitFor(() => {
          expect(getByText('translated-en')).toBeTruthy();
        });

        const languageSelector = getByRole('button', { name: 'post.translation.selectLanguage' });
        fireEvent.press(languageSelector);

        const spanishOption = getByText('Spanish');
        fireEvent.press(spanishOption);

        await waitFor(() => {
          expect(mutateAsyncMock).toHaveBeenCalledWith({ text: 'Hello world', targetLanguage: 'es' });
        });

        await waitFor(() => {
          expect(getByText('translated-es')).toBeTruthy();
        });
      } finally {
        restoreUseState();
      }
    });

    it('shows an error message when translation fails', async () => {
      const restoreUseState = openMenuByDefault();

      try {
        mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
        mutateAsyncMock.mockRejectedValueOnce(new Error('Boom'));

        const { getByRole, getByText } = render(<PostCard post={basePost} />);

        const translateOption = await waitFor(() =>
          getByRole('menuitem', { name: 'post.actions.translate' }),
        );
        fireEvent.press(translateOption);

        await waitFor(() => {
          expect(getByText('post.translation.error (Boom)')).toBeTruthy();
        });
      } finally {
        restoreUseState();
      }
    });

    it('disables translate option when no post text is available', async () => {
      const restoreUseState = openMenuByDefault();

      try {
        mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
        const postWithoutText: Post = { ...basePost, text: '' };

        const { getByRole } = render(<PostCard post={postWithoutText} />);

        const translateOption = await waitFor(() =>
          getByRole('menuitem', { name: 'post.actions.translate' }),
        );
        expect(translateOption.props.accessibilityState?.disabled).toBe(true);
      } finally {
        restoreUseState();
      }
    });
  });


  it('shows and hides reply composer', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const { getByRole } = render(<PostCard post={basePost} />);
    fireEvent.press(getByRole('button', { name: /reply to post by Alice/i }));
    expect(PostComposerMock.mock.calls[1][0].visible).toBe(true);
    act(() => {
      PostComposerMock.mock.calls[1][0].onClose();
    });
    expect(PostComposerMock.mock.calls[2][0].visible).toBe(false);
  });

  it('handles image embed interactions', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.images',
        images: [
          {
            fullsize: 'https://example.com/a.jpg',
            alt: 'alt',
            image: { mimeType: 'image/jpeg' },
          },
        ],
      },
    };

    const { UNSAFE_getAllByType } = render(<PostCard post={post} />);

    act(() => {
      ImageMock.mock.calls[1][0].onLoad({ source: { width: 100, height: 50 } });
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const imageButton = touchables.find((t: any) => !t.props.accessibilityLabel);
    fireEvent.press(imageButton);
    expect(ImageViewerMock.mock.calls[0][0].visible).toBe(true);
    act(() => {
      ImageViewerMock.mock.calls[0][0].onClose();
    });
  });

  it('renders youtube embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.external',
        external: { uri: 'https://youtu.be/abc', title: '', description: '' },
      },
    };
    render(<PostCard post={post} />);
    expect(YouTubeEmbedMock).toHaveBeenCalled();
  });

  it('renders gif embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.external',
        external: { uri: 'https://media.tenor.com/xyz.gif', title: '', description: '' },
      },
    };
    render(<PostCard post={post} />);
    expect(GifEmbedMock).toHaveBeenCalled();
  });

  it('renders external embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.external',
        external: { uri: 'https://example.com', title: '', description: '' },
      },
    };
    render(<PostCard post={post} />);
    expect(ExternalEmbedMock).toHaveBeenCalled();
  });

  it('renders native video embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.video#view',
        playlist: 'https://example.com/video.m3u8',
        thumbnail: 'thumb.jpg',
        aspectRatio: { width: 16, height: 9 },
        alt: 'video',
      },
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock.mock.calls[0][0].embed.videoUrl).toBe('https://example.com/video.m3u8');
  });

  it('renders legacy video embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        video: { ref: { $link: 'https://example.com/legacy.mp4' }, alt: 'legacy' },
        aspectRatio: { width: 16, height: 9 },
      },
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock.mock.calls[VideoEmbedMock.mock.calls.length - 1][0].embed.videoUrl).toBe(
      'https://example.com/legacy.mp4',
    );
  });

  it('renders external video embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.external',
        external: { uri: 'https://example.com/video.mp4', title: '', description: '' },
      },
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock).toHaveBeenCalled();
  });

  it('renders record embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.record#view',
        record: {
          uri: 'at://post/2',
          cid: 'cid2',
          author: { did: 'did:plc:123', handle: 'bob', displayName: 'Bob', avatar: '' },
          record: {},
          replyCount: 0,
          repostCount: 0,
          likeCount: 0,
          indexedAt: '',
        },
      },
    };
    render(<PostCard post={post} />);
    expect(RecordEmbedMock).toHaveBeenCalled();
  });

  it('renders record with media image embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.recordWithMedia#view',
        record: {
          uri: 'at://post/3',
          cid: 'cid3',
          author: { did: 'did:plc:123', handle: 'bob', displayName: 'Bob', avatar: '' },
          record: {},
          replyCount: 0,
          repostCount: 0,
          likeCount: 0,
          indexedAt: '',
        },
        media: {
          $type: 'app.bsky.embed.images#view',
          images: [
            {
              fullsize: 'https://example.com/b.jpg',
              alt: 'alt',
              image: { mimeType: 'image/jpeg' },
            },
          ],
        },
      },
    };
    render(<PostCard post={post} />);
    expect(RecordEmbedMock).toHaveBeenCalled();
  });

  it('renders record with media video embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.recordWithMedia#view',
        record: {
          uri: 'at://post/4',
          cid: 'cid4',
          author: { did: 'did:plc:123', handle: 'bob', displayName: 'Bob', avatar: '' },
          record: {},
          replyCount: 0,
          repostCount: 0,
          likeCount: 0,
          indexedAt: '',
        },
        media: {
          $type: 'app.bsky.embed.video#view',
          playlist: 'https://example.com/rvideo.m3u8',
          thumbnail: 'thumb2.jpg',
          alt: 'rvideo',
          aspectRatio: { width: 4, height: 3 },
        },
      },
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock).toHaveBeenCalled();
  });

  it('renders legacy record media video embed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        $type: 'app.bsky.embed.recordWithMedia#view',
        record: {
          uri: 'at://post/6',
          cid: 'cid6',
          author: { did: 'did:plc:123', handle: 'bob', displayName: 'Bob', avatar: '' },
          record: {},
          replyCount: 0,
          repostCount: 0,
          likeCount: 0,
          indexedAt: '',
        },
        media: {
          video: { ref: { $link: 'https://example.com/rlegacy.mp4' }, alt: 'rlegacy' },
          aspectRatio: { width: 1, height: 1 },
        },
      },
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock.mock.calls[VideoEmbedMock.mock.calls.length - 1][0].embed.videoUrl).toBe(
      'https://example.com/rlegacy.mp4',
    );
  });

  it('renders video from embeds array', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: undefined,
      embeds: [
        {
          $type: 'app.bsky.embed.video#view',
          playlist: 'https://example.com/arrayvideo.m3u8',
          thumbnail: 't.jpg',
          alt: 'avideo',
          aspectRatio: { width: 16, height: 9 },
        },
      ],
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock).toHaveBeenCalled();
  });

  it('renders legacy video from embeds array', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: undefined,
      embeds: [
        {
          video: { ref: { $link: 'https://example.com/arrlegacy.mp4' }, alt: 'arrlegacy' },
          aspectRatio: { width: 16, height: 9 },
        },
      ],
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock.mock.calls[VideoEmbedMock.mock.calls.length - 1][0].embed.videoUrl).toBe(
      'https://example.com/arrlegacy.mp4',
    );
  });

  it('renders recordWithMedia video from embeds array', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: undefined,
      embeds: [
        {
          $type: 'app.bsky.embed.recordWithMedia#view',
          record: {
            uri: 'at://post/5',
            cid: 'cid5',
            author: { did: 'did:plc:123', handle: 'bob', displayName: 'Bob', avatar: '' },
            record: {},
            replyCount: 0,
            repostCount: 0,
            likeCount: 0,
            indexedAt: '',
          },
          media: {
            $type: 'app.bsky.embed.video#view',
            playlist: 'https://example.com/arrayrvideo.m3u8',
            thumbnail: 't2.jpg',
            alt: 'arvideo',
            aspectRatio: { width: 16, height: 9 },
          },
        },
      ],
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock).toHaveBeenCalled();
  });

  it('renders legacy recordWithMedia video from embeds array', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: undefined,
      embeds: [
        {
          $type: 'app.bsky.embed.recordWithMedia#view',
          record: {
            uri: 'at://post/7',
            cid: 'cid7',
            author: { did: 'did:plc:123', handle: 'bob', displayName: 'Bob', avatar: '' },
            record: {},
            replyCount: 0,
            repostCount: 0,
            likeCount: 0,
            indexedAt: '',
          },
          media: {
            video: { ref: { $link: 'https://example.com/embedsrlegacy.mp4' }, alt: 'embedsrlegacy' },
            aspectRatio: { width: 4, height: 3 },
          },
        },
      ],
    };
    render(<PostCard post={post} />);
    expect(VideoEmbedMock.mock.calls[VideoEmbedMock.mock.calls.length - 1][0].embed.videoUrl).toBe(
      'https://example.com/embedsrlegacy.mp4',
    );
  });

  it('handles embed with images field only', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = {
      ...basePost,
      embed: {
        images: [
          {
            fullsize: 'https://example.com/c.jpg',
            alt: 'alt',
            image: { mimeType: 'image/jpeg' },
          },
        ],
      },
    };
    render(<PostCard post={post} />);
    expect(ImageMock).toHaveBeenCalled();
  });

  it('handles unknown embed without images', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const post: Post = { ...basePost, embed: { $type: 'unknown' } };
    render(<PostCard post={post} />);
    expect(ImageMock.mock.calls.length).toBe(1);
  });
});

