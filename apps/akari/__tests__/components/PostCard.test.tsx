import { fireEvent, render } from '@testing-library/react-native';

import { PostCard } from '@/components/PostCard';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { router } from 'expo-router';

jest.mock('@/hooks/mutations/useLikePost');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: () => null }));

// Mock heavy child components that are not under test
jest.mock('@/components/ExternalEmbed', () => ({ ExternalEmbed: () => null }));
jest.mock('@/components/GifEmbed', () => ({ GifEmbed: () => null }));
jest.mock('@/components/ImageViewer', () => ({ ImageViewer: () => null }));
jest.mock('@/components/Labels', () => ({ Labels: () => null }));
jest.mock('@/components/PostComposer', () => ({ PostComposer: () => null }));
jest.mock('@/components/RecordEmbed', () => ({ RecordEmbed: () => null }));
jest.mock('@/components/RichTextWithFacets', () => ({ RichTextWithFacets: () => null }));
jest.mock('@/components/VideoEmbed', () => ({ VideoEmbed: () => null }));
jest.mock('@/components/YouTubeEmbed', () => ({ YouTubeEmbed: () => null }));
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));

type Post = {
  id: string;
  text?: string;
  author: { handle: string; displayName?: string; avatar?: string };
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  uri?: string;
  cid?: string;
  viewer?: { like?: string };
};

describe('PostCard', () => {
  const mockUseLikePost = useLikePost as jest.Mock;
  const mockUseThemeColor = useThemeColor as jest.Mock;
  const mockUseTranslation = useTranslation as jest.Mock;

  const basePost: Post = {
    id: '1',
    text: 'Hello world',
    author: { handle: 'alice', displayName: 'Alice' },
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
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  });

  it('navigates to profile when handle pressed', () => {
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    const { getByRole } = render(<PostCard post={basePost} />);
    const button = getByRole('button', { name: /view profile of Alice/i });
    fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith('/profile/alice');
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
});

