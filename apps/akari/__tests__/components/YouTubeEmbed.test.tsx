import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');

const mockUseThemeColor = useThemeColor as jest.Mock;

type Embed = {
  $type: 'app.bsky.embed.external';
  external: {
    description: string;
    title: string;
    uri: string;
    thumb?: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
  };
};

const createEmbed = (uri: string, thumbUrl?: string): Embed => ({
  $type: 'app.bsky.embed.external',
  external: {
    description: 'Video description',
    title: 'Video title',
    uri,
    ...(thumbUrl && {
      thumb: {
        $type: 'blob',
        ref: { $link: thumbUrl },
        mimeType: 'image/jpeg',
        size: 123,
      },
    }),
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#000');
});

describe('YouTubeEmbed', () => {
  it.each([
    ['watch link', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['embed link', 'https://youtube.com/embed/dQw4w9WgXcQ'],
  ])('renders video for %s and opens link on press', (_, uri) => {
    const embed = createEmbed(uri);
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce();

    const { getByText } = render(<YouTubeEmbed embed={embed} />);

    expect(getByText('Video title')).toBeTruthy();
    expect(getByText('Video description')).toBeTruthy();
    expect(getByText('ui.youtube')).toBeTruthy();

    fireEvent.press(getByText('Video title'));

    expect(openUrl).toHaveBeenCalledWith(uri);

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    expect(props.source).toEqual({
      uri: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    });
  });

  it('uses provided thumbnail when URL is not YouTube', () => {
    const embed = createEmbed(
      'https://example.com/video',
      'https://example.com/thumb.jpg',
    );
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce();
    const { getByText } = render(<YouTubeEmbed embed={embed} />);

    fireEvent.press(getByText('Video title'));
    expect(openUrl).toHaveBeenCalledWith('https://example.com/video');

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    expect(props.source).toEqual({ uri: 'https://example.com/thumb.jpg' });
  });

  it('renders without thumbnail when none available', () => {
    const embed = createEmbed('https://example.com/video');
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce();
    const { getByText } = render(<YouTubeEmbed embed={embed} />);

    fireEvent.press(getByText('Video title'));
    expect(openUrl).toHaveBeenCalledWith('https://example.com/video');

    const Image = require('expo-image').Image as jest.Mock;
    expect(Image).not.toHaveBeenCalled();
  });
});

