import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { VideoEmbed } from '@/components/VideoEmbed';
import { resolveBlueskyVideoUrl } from '@/bluesky-api';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { VideoPlayer } from '@/components/VideoPlayer';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/VideoPlayer', () => ({ VideoPlayer: jest.fn(() => null) }));
jest.mock('@/bluesky-api', () => ({ resolveBlueskyVideoUrl: jest.fn() }));

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockVideoPlayer = VideoPlayer as jest.Mock;
const mockResolveVideoUrl = resolveBlueskyVideoUrl as jest.Mock;

describe('VideoEmbed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('renders native video and resolves Bluesky URL', async () => {
    mockResolveVideoUrl.mockResolvedValueOnce('https://cdn.bsky.app/video.mp4');
    const embed = {
      videoUrl: 'https://video.bsky.app/v/123/playlist.m3u8',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      aspectRatio: { width: 16, height: 9 },
    };

    render(<VideoEmbed embed={embed} />);

    await waitFor(() => expect(mockVideoPlayer).toHaveBeenCalled());
    expect(mockResolveVideoUrl).toHaveBeenCalledWith('https://video.bsky.app/v/123/playlist.m3u8');
    expect(mockVideoPlayer.mock.calls[0][0].videoUrl).toBe('https://cdn.bsky.app/video.mp4');
    expect(mockVideoPlayer.mock.calls[0][0].thumbnailUrl).toBe('https://example.com/thumb.jpg');
  });

  it('falls back to original URL when resolution fails', async () => {
    mockResolveVideoUrl.mockRejectedValueOnce(new Error('fail'));
    const embed = {
      videoUrl: 'https://video.bsky.app/v/123/playlist.m3u8',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    };

    render(<VideoEmbed embed={embed} />);

    await waitFor(() => expect(mockVideoPlayer).toHaveBeenCalled());
    expect(mockResolveVideoUrl).toHaveBeenCalled();
    expect(mockVideoPlayer.mock.calls[0][0].videoUrl).toBe('https://video.bsky.app/v/123/playlist.m3u8');
  });

  it('renders native video without resolving when not a Bluesky playlist', async () => {
    const embed = {
      videoUrl: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    };

    render(<VideoEmbed embed={embed} />);

    await waitFor(() => expect(mockVideoPlayer).toHaveBeenCalled());
    expect(mockResolveVideoUrl).not.toHaveBeenCalled();
    expect(mockVideoPlayer.mock.calls[0][0].videoUrl).toBe('https://example.com/video.mp4');
  });

  it('renders external video and opens link on press', () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce();
    const embed = {
      external: {
        uri: 'https://example.com/video',
        title: 'Test Video',
        description: 'An external video',
        thumb: {
          $type: 'blob',
          ref: { $link: 'https://example.com/thumb.jpg' },
          mimeType: 'image/jpeg',
          size: 0,
        },
      },
      aspectRatio: { width: 16, height: 9 },
    };

    const { getByText } = render(<VideoEmbed embed={embed} />);
    fireEvent.press(getByText('Test Video'));
    expect(openUrl).toHaveBeenCalledWith('https://example.com/video');

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    expect(props.source).toEqual({ uri: 'https://example.com/thumb.jpg' });
  });

  it('renders placeholder when no video data', () => {
    const { getByText } = render(<VideoEmbed embed={{} as any} />);
    expect(getByText('Video content')).toBeTruthy();
  });
});

