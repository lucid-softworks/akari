import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { ExternalEmbed } from '@/components/ExternalEmbed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#000');
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
});

const createEmbed = (uri: string) => ({
  $type: 'app.bsky.embed.external',
  external: {
    description: 'A cool site',
    thumb: {
      $type: 'blob',
      ref: { $link: 'https://example.com/thumb.jpg' },
      mimeType: 'image/jpeg',
      size: 123,
    },
    title: 'Example Site',
    uri,
  },
});

describe('ExternalEmbed', () => {
  it('renders title, description, and domain', () => {
    const embed = createEmbed('https://example.com/article');
    const { getByText } = render(<ExternalEmbed embed={embed} />);

    expect(getByText('Example Site')).toBeTruthy();
    expect(getByText('A cool site')).toBeTruthy();
    expect(getByText('example.com')).toBeTruthy();

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    expect(props.source).toEqual({ uri: 'https://example.com/thumb.jpg' });
  });

  it('opens link when pressed', () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce();
    const embed = createEmbed('https://example.com/article');
    const { getByText } = render(<ExternalEmbed embed={embed} />);

    fireEvent.press(getByText('Example Site'));

    expect(openUrl).toHaveBeenCalledWith('https://example.com/article');
  });

  it('falls back to translation key for invalid url', () => {
    const embed = createEmbed('not-a-valid-url');
    const { getByText } = render(<ExternalEmbed embed={embed} />);

    expect(getByText('common.externalLink')).toBeTruthy();
  });
});
