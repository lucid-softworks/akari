import { act, fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { Platform, Share } from 'react-native';

import { Lightbox } from '@/components/ui/Lightbox';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useConfirm', () => ({ useConfirm: () => jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-gesture-handler', () => {
  const noop = () => {};
  const gesture = {
    onStart: () => gesture,
    onUpdate: () => gesture,
    onEnd: () => gesture,
    onChange: () => gesture,
    onFinalize: () => gesture,
    averageTouches: () => gesture,
    minDuration: () => gesture,
    maxDuration: () => gesture,
    numberOfTaps: () => gesture,
    requireExternalGestureToFail: () => gesture,
  };
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Gesture: {
      Pinch: () => gesture,
      Pan: () => gesture,
      Tap: () => gesture,
      Simultaneous: () => gesture,
      Exclusive: () => gesture,
    },
    noop,
  };
});

const mockUseTranslation = useTranslation as jest.Mock;

const T_MAP: Record<string, string> = {
  'common.loading': 'Loading',
  'common.failedToLoadImage': 'Failed to load image',
  'common.checkOutImage': 'Check out this image',
  'common.error': 'Error',
  'common.failedToDownloadImage': 'Failed to download image',
  'common.close': 'Close',
  'common.share': 'Share',
};

describe('Lightbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => T_MAP[key] ?? key });
  });

  it('renders alt text and closes via the close button', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <Lightbox visible onClose={onClose} imageUrl="https://example.com/a.jpg" altText="Alt" />,
    );
    expect(getByText('Alt')).toBeTruthy();
    fireEvent.press(getByTestId('close-button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the "n / m" counter when multiple images are provided', () => {
    const { getByText } = render(
      <Lightbox
        visible
        onClose={() => {}}
        images={[
          { url: 'https://example.com/a.jpg', alt: 'A' },
          { url: 'https://example.com/b.jpg', alt: 'B' },
          { url: 'https://example.com/c.jpg' },
        ]}
        startIndex={0}
      />,
    );
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('uses the Share API on native when the share button is pressed', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    const shareMock = jest.spyOn(Share, 'share').mockResolvedValue({} as never);

    const { getByTestId } = render(
      <Lightbox visible onClose={() => {}} imageUrl="https://example.com/a.jpg" />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('download-button'));
    });

    expect(shareMock).toHaveBeenCalledWith({
      url: 'https://example.com/a.jpg',
      message: 'Check out this image',
    });

    shareMock.mockRestore();
    Platform.OS = originalOS;
  });

  it('creates a download link on web', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';

    const click = jest.fn();
    const link = { href: '', download: '', click } as unknown as HTMLAnchorElement;
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    (global as unknown as { document: Document }).document = {
      createElement: jest.fn(() => link),
      body: { appendChild, removeChild },
    } as unknown as Document;

    const { getByTestId } = render(
      <Lightbox visible onClose={() => {}} imageUrl="https://example.com/a.jpg" />,
    );

    fireEvent.press(getByTestId('download-button'));

    expect(link.href).toBe('https://example.com/a.jpg');
    expect(link.download).toBe('image.jpg');
    expect(click).toHaveBeenCalled();

    delete (global as { document?: Document }).document;
    Platform.OS = originalOS;
  });

  it('returns null when no images are provided', () => {
    const { toJSON } = render(<Lightbox visible onClose={() => {}} />);
    expect(toJSON()).toBeNull();
  });
});
