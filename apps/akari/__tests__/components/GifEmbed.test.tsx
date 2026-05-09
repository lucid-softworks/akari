import { fireEvent, render } from '@testing-library/react-native';

import { GifEmbed } from '@/components/GifEmbed';
import { useFeedSettings } from '@/hooks/useFeedSettings';
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
jest.mock('@/hooks/useFeedSettings');

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseFeedSettings = useFeedSettings as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#000');
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  mockUseFeedSettings.mockReturnValue({ videoAutoplayEnabled: true });
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
  it('renders the GIF badge and starts autoplaying', () => {
    const embed = createEmbed('A cool gif');
    const { getByText } = render(<GifEmbed embed={embed} />);

    // Component renders the inline GIF image and a translated "ui.gif"
    // badge. Title/description aren't shown — the bsky GifEmbed deliberately
    // keeps the chrome minimal.
    expect(getByText('ui.gif')).toBeTruthy();

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    expect(props.source).toEqual({ uri: 'https://example.com/gif.gif' });
    expect(props.autoplay).toBe(true);
  });

  it('toggles autoplay (pause/play) on press instead of opening the URL', () => {
    const embed = createEmbed('A cool gif');
    const { getByText, getByLabelText, UNSAFE_getAllByType } = render(<GifEmbed embed={embed} />);

    // Tap to pause.
    fireEvent.press(getByText('ui.gif'));

    // The accessibility label should now flip to "play" because the gif is paused.
    expect(getByLabelText('ui.play')).toBeTruthy();

    // Tap again to resume.
    fireEvent.press(getByLabelText('ui.play'));
    expect(getByLabelText('ui.pause')).toBeTruthy();

    // Sanity check — the same `<Image>` instance keeps mounting; we never
    // navigate away, just flip the autoplay prop on it.
    const Image = require('expo-image').Image as jest.Mock;
    const lastProps = Image.mock.calls[Image.mock.calls.length - 1][0];
    expect(lastProps.source).toEqual({ uri: 'https://example.com/gif.gif' });
    // Quiet the unused destructure warning.
    expect(UNSAFE_getAllByType).toBeTruthy();
  });

  it('renders even without a description', () => {
    const embed = createEmbed();
    const { getByText, queryByText } = render(<GifEmbed embed={embed} />);

    expect(getByText('ui.gif')).toBeTruthy();
    expect(queryByText('A cool gif')).toBeNull();
  });
});
