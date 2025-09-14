import { act, fireEvent, render } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';

import { ImageViewer } from '@/components/ImageViewer';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/alert');

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

describe('ImageViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({
      t: (key: string) => {
        const map: Record<string, string> = {
          'common.loading': 'Loading',
          'common.failedToLoadImage': 'Failed to load image',
          'common.checkOutImage': 'Check out this image',
          'common.error': 'Error',
          'common.failedToDownloadImage': 'Failed to download image',
        };
        return map[key] ?? key;
      },
    });
  });

  it('renders alt text and handles close action', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ImageViewer visible onClose={onClose} imageUrl="url" altText="Alt" />,
    );

    expect(getByText('Alt')).toBeTruthy();
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading text until image loads', () => {
    const { getByText, queryByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    expect(getByText('Loading')).toBeTruthy();

    const Image = require('expo-image').Image as jest.Mock;
    act(() => {
      Image.mock.calls[0][0].onLoad();
    });

    expect(queryByText('Loading')).toBeNull();
  });

  it('displays error text when image fails to load', () => {
    const { getByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    const Image = require('expo-image').Image as jest.Mock;
    act(() => {
      Image.mock.calls[0][0].onError();
    });

    expect(getByText('Failed to load image')).toBeTruthy();
  });

  it('uses Share API to download image on mobile platforms', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    const shareMock = jest.spyOn(Share, 'share').mockResolvedValue({} as any);

    const { getByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    await act(async () => {
      fireEvent.press(getByText('⬇️'));
    });

    expect(shareMock).toHaveBeenCalledWith({
      url: 'url',
      message: 'Check out this image',
    });

    shareMock.mockRestore();
    Platform.OS = originalOS;
  });

  it('creates a download link on web platforms', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';

    const click = jest.fn();
    const link = { href: '', download: '', click } as HTMLAnchorElement;
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    (global as any).document = {
      createElement: jest.fn(() => link),
      body: { appendChild, removeChild },
    } as unknown as Document;

    const { getByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    fireEvent.press(getByText('⬇️'));

    expect((global as any).document.createElement).toHaveBeenCalledWith('a');
    expect(link.href).toBe('url');
    expect(link.download).toBe('image.jpg');
    expect(click).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(removeChild).toHaveBeenCalledWith(link);

    delete (global as any).document;
    Platform.OS = originalOS;
  });

  it('shows alert when download fails', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('fail'));

    const { getByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    await act(async () => {
      fireEvent.press(getByText('⬇️'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith({
      title: 'Error',
      message: 'Failed to download image',
    });

    Platform.OS = originalOS;
  });
});
