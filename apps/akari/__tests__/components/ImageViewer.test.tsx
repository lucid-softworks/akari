import { act, fireEvent, render } from '@testing-library/react-native';
import { Platform, Share, TouchableOpacity } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { ImageViewer } from '@/components/ImageViewer';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/alert');
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');

  const handlerStore = {
    pinch: undefined as
      | {
          handlers: {
            onStart?: (event?: unknown) => void;
            onUpdate?: (event: unknown) => void;
            onEnd?: (event?: unknown) => void;
          };
        }
      | undefined,
    pan: undefined as
      | {
          handlers: {
            onStart?: (event?: unknown) => void;
            onUpdate?: (event: unknown) => void;
            onEnd?: (event?: unknown) => void;
          };
        }
      | undefined,
  };

  const createGesture = (type: 'pinch' | 'pan') => {
    const gesture = {
      handlers: {} as {
        onStart?: (event?: unknown) => void;
        onUpdate?: (event: unknown) => void;
        onEnd?: (event?: unknown) => void;
      },
      onStart(callback: (event?: unknown) => void) {
        gesture.handlers.onStart = callback;
        return gesture;
      },
      onUpdate(callback: (event: unknown) => void) {
        gesture.handlers.onUpdate = callback;
        return gesture;
      },
      onEnd(callback: (event?: unknown) => void) {
        gesture.handlers.onEnd = callback;
        return gesture;
      },
    };

    handlerStore[type] = gesture;
    return gesture;
  };

  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Gesture: {
      Pinch: () => createGesture('pinch'),
      Pan: () => createGesture('pan'),
      Simultaneous: (...gestures: unknown[]) => gestures,
    },
    __handlerStore: handlerStore,
  };
});

type SharedValue<T> = { value: T };

const sharedValues: SharedValue<number>[] = [];
const useSharedValueSpy = jest.spyOn(Reanimated, 'useSharedValue') as jest.SpyInstance<SharedValue<number>, [number]>;

const getSharedValueMap = () => {
  if (sharedValues.length < 6) {
    throw new Error('Shared values have not been initialised.');
  }

  const [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY] = sharedValues as [
    SharedValue<number>,
    SharedValue<number>,
    SharedValue<number>,
    SharedValue<number>,
    SharedValue<number>,
    SharedValue<number>,
  ];

  return { scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY };
};

type GestureHandlerStore = {
  pinch?: {
    handlers: {
      onStart?: (event?: unknown) => void;
      onUpdate?: (event: unknown) => void;
      onEnd?: (event?: unknown) => void;
    };
  };
  pan?: {
    handlers: {
      onStart?: (event?: unknown) => void;
      onUpdate?: (event: unknown) => void;
      onEnd?: (event?: unknown) => void;
    };
  };
};

const getGestureStore = () =>
  (
    require('react-native-gesture-handler') as typeof import('react-native-gesture-handler') & {
      __handlerStore: GestureHandlerStore;
    }
  ).__handlerStore;

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

describe('ImageViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sharedValues.length = 0;
    useSharedValueSpy.mockImplementation((initialValue: number) => {
      const sharedValue: SharedValue<number> = { value: initialValue };
      sharedValues.push(sharedValue);
      return sharedValue;
    });
    const gestureStore = getGestureStore();
    if (gestureStore) {
      gestureStore.pinch = undefined;
      gestureStore.pan = undefined;
    }
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

  afterEach(() => {
    useSharedValueSpy.mockReset();
  });

  it('renders alt text and handles close action', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(<ImageViewer visible onClose={onClose} imageUrl="url" altText="Alt" />);

    expect(getByText('Alt')).toBeTruthy();
    fireEvent.press(getByTestId('close-button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading text until image loads', () => {
    const { getByText, queryByText } = render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    expect(getByText('Loading')).toBeTruthy();

    const Image = require('expo-image').Image as jest.Mock;
    act(() => {
      Image.mock.calls[0][0].onLoad();
    });

    expect(queryByText('Loading')).toBeNull();
  });

  it('displays error text when image fails to load', () => {
    const { getByText, getByTestId } = render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

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

    const { getByText, getByTestId } = render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    await act(async () => {
      fireEvent.press(getByTestId('download-button'));
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

    const { getByText, getByTestId } = render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    fireEvent.press(getByTestId('download-button'));

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

    const { getByText, getByTestId } = render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    await act(async () => {
      fireEvent.press(getByTestId('download-button'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith({
      title: 'Error',
      message: 'Failed to download image',
    });

    Platform.OS = originalOS;
  });

  it('resets zoom and translation when pinch gesture ends with a small scale', () => {
    render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    const gestureStore = getGestureStore();
    const pinch = gestureStore?.pinch;
    const { scale, savedScale, translateX, translateY } = getSharedValueMap();

    expect(pinch).toBeDefined();

    act(() => {
      pinch?.handlers.onStart?.();
      pinch?.handlers.onUpdate?.({ scale: 0.4 });
      pinch?.handlers.onEnd?.();
    });

    expect(scale.value).toBe(1);
    expect(savedScale.value).toBe(1);
    expect(translateX.value).toBe(0);
    expect(translateY.value).toBe(0);
  });

  it('updates translation only when zoomed in during pan gestures', () => {
    render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    const gestureStore = getGestureStore();
    const pinch = gestureStore?.pinch;
    const pan = gestureStore?.pan;
    const sharedValuesMap = getSharedValueMap();

    expect(pinch).toBeDefined();
    expect(pan).toBeDefined();

    act(() => {
      pinch?.handlers.onStart?.();
      pinch?.handlers.onUpdate?.({ scale: 2 });
      pinch?.handlers.onEnd?.();
    });

    act(() => {
      pan?.handlers.onStart?.();
      pan?.handlers.onUpdate?.({ translationX: 40, translationY: -20 });
      pan?.handlers.onEnd?.();
    });

    expect(sharedValuesMap.translateX.value).toBe(40);
    expect(sharedValuesMap.translateY.value).toBe(-20);

    act(() => {
      pinch?.handlers.onStart?.();
      pinch?.handlers.onUpdate?.({ scale: 0.4 });
      pinch?.handlers.onEnd?.();
    });

    act(() => {
      pan?.handlers.onStart?.();
      pan?.handlers.onUpdate?.({ translationX: 15, translationY: 10 });
      pan?.handlers.onEnd?.();
    });

    expect(sharedValuesMap.translateX.value).toBe(0);
    expect(sharedValuesMap.translateY.value).toBe(0);
  });

  it('toggles zoom with double taps and recenters the image', () => {
    const { UNSAFE_getAllByType } = render(<ImageViewer visible onClose={() => {}} imageUrl="url" />);

    const gestureStore = getGestureStore();
    const pan = gestureStore?.pan;
    const sharedValuesMap = getSharedValueMap();
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const imageTouchable = touchables.find((touchable) => touchable.props.activeOpacity === 1);

    expect(imageTouchable).toBeDefined();

    act(() => {
      imageTouchable?.props.onLongPress?.();
    });

    expect(sharedValuesMap.scale.value).toBe(2);

    act(() => {
      pan?.handlers.onStart?.();
      pan?.handlers.onUpdate?.({ translationX: 25, translationY: -15 });
      pan?.handlers.onEnd?.();
    });

    expect(sharedValuesMap.translateX.value).toBe(25);
    expect(sharedValuesMap.translateY.value).toBe(-15);

    act(() => {
      imageTouchable?.props.onLongPress?.();
    });

    expect(sharedValuesMap.scale.value).toBe(1);
    expect(sharedValuesMap.translateX.value).toBe(0);
    expect(sharedValuesMap.translateY.value).toBe(0);
  });
});
