import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import * as WebPlayerModule from '../../components/VideoPlayer.web';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('react-native-video', () => 'Video');

const mockWebPlayer = jest.spyOn(WebPlayerModule, 'VideoPlayer').mockImplementation(() => null);

import { VideoPlayer } from '@/components/VideoPlayer';

const mockUseThemeColor = useThemeColor as jest.Mock;

describe('VideoPlayer', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('renders thumbnail with play icon and title', () => {
    const { getByText } = render(<VideoPlayer videoUrl="https://example.com/video.mp4" title="Sample" />);
    expect(getByText('▶')).toBeTruthy();
    expect(getByText('Sample')).toBeTruthy();
  });

  it('renders web player on web platform', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    render(<VideoPlayer videoUrl="https://example.com/video.mp4" />);
    expect(mockWebPlayer).toHaveBeenCalled();
  });
});

