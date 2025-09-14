import { act, fireEvent, render } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';

import { ImageViewer } from '@/components/ImageViewer';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

const createGesture = () => ({
  onStart: jest.fn().mockReturnThis(),
  onUpdate: jest.fn().mockReturnThis(),
  onEnd: jest.fn().mockReturnThis(),
});

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pinch: createGesture,
    Pan: createGesture,
    Simultaneous: jest.fn(),
  },
}));

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/alert');

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#000');
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
});

describe('ImageViewer', () => {
  it('renders alt text and handles loading state', () => {
    const { getByText, queryByText } = render(
      <ImageViewer
        visible
        onClose={jest.fn()}
        imageUrl="https://example.com/image.jpg"
        altText="Alt description"
      />,
    );

    expect(getByText('Alt description')).toBeTruthy();
    expect(getByText('common.loading')).toBeTruthy();

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    act(() => {
      props.onLoad();
    });

    expect(queryByText('common.loading')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ImageViewer visible onClose={onClose} imageUrl="https://example.com/image.jpg" />,
    );

    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shares image when download button is pressed', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValueOnce();

    const { getByText } = render(
      <ImageViewer visible onClose={jest.fn()} imageUrl="https://example.com/image.jpg" />,
    );

    await act(async () => {
      fireEvent.press(getByText('⬇️'));
    });

    expect(shareSpy).toHaveBeenCalledWith({
      url: 'https://example.com/image.jpg',
      message: 'common.checkOutImage',
    });

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('shows alert when download fails', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('fail'));

    const { getByText } = render(
      <ImageViewer visible onClose={jest.fn()} imageUrl="https://example.com/image.jpg" />,
    );

    await act(async () => {
      fireEvent.press(getByText('⬇️'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith({
      title: 'common.error',
      message: 'common.failedToDownloadImage',
    });

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('shows error message on image load failure', () => {
    const { getByText, queryByText } = render(
      <ImageViewer visible onClose={jest.fn()} imageUrl="https://example.com/image.jpg" />,
    );

    const Image = require('expo-image').Image as jest.Mock;
    const props = Image.mock.calls[0][0];
    act(() => {
      props.onError();
    });

    expect(getByText('common.failedToLoadImage')).toBeTruthy();
    expect(queryByText('common.loading')).toBeNull();
  });
});
