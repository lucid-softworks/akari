import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { VideoEmbed } from '@/components/VideoEmbed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { VideoPlayer } from '@/components/VideoPlayer';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/VideoPlayer', () => ({ VideoPlayer: jest.fn(() => null) }));

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockVideoPlayer = VideoPlayer as jest.Mock;

describe('VideoEmbed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('renders native video and passes playlist URL through to the player', () => {
    const embed = {
      videoUrl: 'https://video.bsky.app/v/123/playlist.m3u8',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      aspectRatio: { width: 16, height: 9 },
    };

    render(<VideoEmbed embed={embed} />);

    expect(mockVideoPlayer).toHaveBeenCalledTimes(1);
    expect(mockVideoPlayer.mock.calls[0][0]).toMatchObject({
      videoUrl: 'https://video.bsky.app/v/123/playlist.m3u8',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      aspectRatio: { width: 16, height: 9 },
    });
  });

  it('renders native video without a thumbnail when not provided', () => {
    const embed = {
      videoUrl: 'https://example.com/video.mp4',
    };

    render(<VideoEmbed embed={embed} />);

    expect(mockVideoPlayer).toHaveBeenCalledTimes(1);
    expect(mockVideoPlayer.mock.calls[0][0]).toMatchObject({
      videoUrl: 'https://example.com/video.mp4',
      thumbnailUrl: undefined,
    });
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

