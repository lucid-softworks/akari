import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { GifEmbed } from '@/components/GifEmbed';
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

type Embed = {
  $type: 'app.bsky.embed.external';
  external: {
    description: string;
    title: string;
    uri: string;
  };
};

const createEmbed = (description: string = ''): Embed => ({
  $type: 'app.bsky.embed.external',
  external: {
    description,
    title: 'Funny GIF',
    uri: 'https://example.com/gif.gif',
  },
});

describe('GifEmbed', () => {
  it('renders the GIF badge and opens link on press', () => {
    const embed = createEmbed('A cool gif');
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
    const { getByText } = render(<GifEmbed embed={embed} />);

    // Component currently only renders the GIF image and a translated "ui.gif"
    // badge. Title/description aren't shown — the bsky GifEmbed deliberately
    // keeps the chrome minimal.
    expect(getByText('ui.gif')).toBeTruthy();

    fireEvent.press(getByText('ui.gif'));

    expect(openUrl).toHaveBeenCalledWith('https://example.com/gif.gif');

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    expect(props.source).toEqual({ uri: 'https://example.com/gif.gif' });
  });

  it('renders even without a description', () => {
    const embed = createEmbed();
    const { getByText, queryByText } = render(<GifEmbed embed={embed} />);

    expect(getByText('ui.gif')).toBeTruthy();
    expect(queryByText('A cool gif')).toBeNull();
  });
});
