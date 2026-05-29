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

  it('renders a pagination dot per image when multiple images are provided', () => {
    // The header "n / m" counter was removed in favour of a bottom dot row;
    // the multi-image lightbox now shows one dot per image with the current
    // one highlighted, and the alt text for the starting image.
    const { getByText, UNSAFE_root } = render(
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

    // Alt text for the starting image is shown in the footer card.
    expect(getByText('A')).toBeTruthy();

    // One dot per image; the active dot carries the wider `dotActive` style.
    const dots = UNSAFE_root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        Array.isArray(node.props.style) &&
        node.props.style.some((s: unknown) => s && (s as { width?: number }).width === 6),
    );
    expect(dots).toHaveLength(3);
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
    // The Modal engages `useBodyScrollLock` on web, which reads/writes
    // documentElement/body styles, so the mock document needs those too.
    (global as unknown as { document: Document }).document = {
      createElement: jest.fn(() => link),
      documentElement: { style: { overflow: '' } },
      body: { appendChild, removeChild, style: { cssText: '' } },
    } as unknown as Document;
    // On web the lightbox attaches keyboard handlers to `window` and the
    // scroll lock calls scrollTo; the RN test env's `window` shim lacks
    // these, so provide them.
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const scrollTo = jest.fn();
    Object.assign(window, { addEventListener, removeEventListener, scrollTo });

    const { getByTestId, unmount } = render(
      <Lightbox visible onClose={() => {}} imageUrl="https://example.com/a.jpg" />,
    );

    fireEvent.press(getByTestId('download-button'));

    expect(link.href).toBe('https://example.com/a.jpg');
    expect(link.download).toBe('image.jpg');
    expect(click).toHaveBeenCalled();

    // Unmount while the web globals are still in place so the scroll-lock /
    // keyboard cleanup effects don't trip over a half-torn-down environment.
    unmount();

    delete (global as { document?: Document }).document;
    delete (window as { addEventListener?: unknown }).addEventListener;
    delete (window as { removeEventListener?: unknown }).removeEventListener;
    delete (window as { scrollTo?: unknown }).scrollTo;
    Platform.OS = originalOS;
  });

  it('returns null when no images are provided', () => {
    const { toJSON } = render(<Lightbox visible onClose={() => {}} />);
    expect(toJSON()).toBeNull();
  });
});
