import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import * as ImagePicker from 'expo-image-picker';

import { PostComposer } from '@/components/PostComposer';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/mutations/useCreatePost');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/GifPicker', () => ({ GifPicker: jest.fn(() => null) }));
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: jest.fn(() => null) }));
jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockUseCreatePost = useCreatePost as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const gifPickerMock = require('@/components/GifPicker').GifPicker as jest.Mock;
const requestPermissionsMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchImageLibraryMock = ImagePicker.launchImageLibraryAsync as jest.Mock;

const extractColor = (style: unknown): string | undefined => {
  if (Array.isArray(style)) {
    let color: string | undefined;

    for (const entry of style) {
      const entryColor = extractColor(entry);
      if (entryColor !== undefined) {
        color = entryColor;
      }
    }

    return color;
  }

  if (style && typeof style === 'object' && 'color' in style) {
    return (style as { color: string }).color;
  }

  return undefined;
};

const hasOutlineNone = (style: unknown): boolean => {
  if (Array.isArray(style)) {
    return style.some((entry) => hasOutlineNone(entry));
  }

  return Boolean(style && typeof style === 'object' && (style as { outline?: string }).outline === 'none');
};

const findAccessibilityState = (
  node: ReactTestInstance | null,
): { disabled?: boolean } | undefined => {
  let current: ReactTestInstance | null = node;

  while (current) {
    const { accessibilityState } = current.props as {
      accessibilityState?: { disabled?: boolean };
    };

    if (accessibilityState) {
      return accessibilityState;
    }

    current = current.parent;
  }

  return undefined;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockImplementation((_, key: string) => {
    switch (key) {
      case 'tint':
        return '#123456';
      case 'icon':
        return '#654321';
      case 'border':
        return '#abcdef';
      default:
        return '#000000';
    }
  });
  mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  requestPermissionsMock.mockReset();
  launchImageLibraryMock.mockReset();
});

describe('PostComposer', () => {
  it('posts trimmed text and closes composer', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: false });
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText } = render(<PostComposer visible onClose={onClose} />);

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('post.postPlaceholder'), '  Hello World  ');
    });

    await act(async () => {
      fireEvent.press(getByText('post.post'));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      text: 'Hello World',
      replyTo: undefined,
      images: undefined,
    });
    expect(onClose).toHaveBeenCalled();
    expect(getByPlaceholderText('post.postPlaceholder').props.value).toBe('');
  });

  it('renders reply context and posts a reply', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: false });
    const onClose = jest.fn();

    const replyTo = {
      root: 'at://root',
      parent: 'at://parent',
      authorHandle: 'reply.author',
    };

    const { getByPlaceholderText, getByText } = render(
      <PostComposer visible onClose={onClose} replyTo={replyTo} />,
    );

    expect(getByText('post.reply')).toBeTruthy();
    expect(getByText(/post\.replyingTo/)).toBeTruthy();
    expect(getByText('@reply.author')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('post.replyPlaceholder'), 'Reply body');
    });

    await act(async () => {
      fireEvent.press(getByText('post.post'));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      text: 'Reply body',
      replyTo: { root: 'at://root', parent: 'at://parent' },
      images: undefined,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('adds and removes images while updating alt text and enforcing limits', async () => {
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    requestPermissionsMock.mockResolvedValue({ status: 'granted' });
    launchImageLibraryMock
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          { uri: 'img-1.jpg', mimeType: 'image/jpeg' },
          { uri: 'img-2.jpg', mimeType: 'image/png' },
          { uri: 'img-3.jpg', mimeType: 'image/png' },
        ],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          { uri: 'img-4.jpg', mimeType: 'image/png' },
          { uri: 'img-5.jpg', mimeType: 'image/png' },
        ],
      });

    const { getByLabelText, getAllByPlaceholderText, getAllByText } = render(
      <PostComposer visible onClose={jest.fn()} />,
    );

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);
    expect(launchImageLibraryMock).toHaveBeenCalledTimes(1);
    let altInputs = getAllByPlaceholderText('post.imageAltTextPlaceholder');
    expect(altInputs).toHaveLength(3);

    fireEvent.changeText(altInputs[1], 'Updated alt text');
    altInputs = getAllByPlaceholderText('post.imageAltTextPlaceholder');
    expect(altInputs[1].props.value).toBe('Updated alt text');

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(2);
    expect(launchImageLibraryMock).toHaveBeenCalledTimes(2);
    altInputs = getAllByPlaceholderText('post.imageAltTextPlaceholder');
    expect(altInputs).toHaveLength(4);

    act(() => {
      const latestCall = gifPickerMock.mock.calls[gifPickerMock.mock.calls.length - 1][0];
      latestCall.onSelectGif({
        uri: 'gif.gif',
        alt: '',
        mimeType: 'image/gif',
        tenorId: 'tenor-1',
      });
    });

    altInputs = getAllByPlaceholderText('post.imageAltTextPlaceholder');
    expect(altInputs).toHaveLength(4);

    const removeButtons = getAllByText('✕');
    fireEvent.press(removeButtons[0]);
    altInputs = getAllByPlaceholderText('post.imageAltTextPlaceholder');
    expect(altInputs).toHaveLength(3);
  });

  it('does not post when empty', () => {
    const mutateAsync = jest.fn();
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: false });
    const onClose = jest.fn();

    const { UNSAFE_getAllByType } = render(<PostComposer visible onClose={onClose} />);
    const disabledButton = UNSAFE_getAllByType(TouchableOpacity).find(
      (touchable) => touchable.props.disabled,
    ) as { props: { onPress?: () => void } };

    act(() => {
      disabledButton.props.onPress?.();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('manages gif picker visibility and selection callbacks', () => {
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByLabelText, getByPlaceholderText } = render(
      <PostComposer visible onClose={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('gif.addGif'));

    let gifCall = gifPickerMock.mock.calls[gifPickerMock.mock.calls.length - 1][0];
    expect(gifCall.visible).toBe(true);
    expect(typeof gifCall.onSelectGif).toBe('function');
    expect(typeof gifCall.onClose).toBe('function');

    act(() => {
      gifCall.onSelectGif({ uri: 'gif.gif', alt: '', mimeType: 'image/gif', tenorId: '1' });
    });
    expect(getByPlaceholderText('post.imageAltTextPlaceholder')).toBeTruthy();

    gifCall = gifPickerMock.mock.calls[gifPickerMock.mock.calls.length - 1][0];
    act(() => {
      gifCall.onClose();
    });

    gifCall = gifPickerMock.mock.calls[gifPickerMock.mock.calls.length - 1][0];
    expect(gifCall.visible).toBe(false);
  });

  it('handles denied permissions and canceled picker results', async () => {
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByLabelText, queryByPlaceholderText } = render(
      <PostComposer visible onClose={jest.fn()} />,
    );

    requestPermissionsMock.mockResolvedValueOnce({ status: 'denied' });

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);
    expect(launchImageLibraryMock).not.toHaveBeenCalled();
    expect(queryByPlaceholderText('post.imageAltTextPlaceholder')).toBeNull();

    requestPermissionsMock.mockResolvedValueOnce({ status: 'granted' });
    launchImageLibraryMock.mockResolvedValueOnce({ canceled: true });

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(2);
    expect(launchImageLibraryMock).toHaveBeenCalledTimes(1);
    expect(queryByPlaceholderText('post.imageAltTextPlaceholder')).toBeNull();
  });

  it('posts with attached images and default mime type', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: false });
    requestPermissionsMock.mockResolvedValue({ status: 'granted' });
    launchImageLibraryMock.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'img-1.jpg', mimeType: 'image/png' },
        { uri: 'img-2.jpg' },
      ],
    });

    const { getByLabelText, getAllByPlaceholderText, getByText } = render(
      <PostComposer visible onClose={jest.fn()} />,
    );

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });

    const altInputs = getAllByPlaceholderText('post.imageAltTextPlaceholder');
    fireEvent.changeText(altInputs[0], 'First image');

    await act(async () => {
      fireEvent.press(getByText('post.post'));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      text: '',
      replyTo: undefined,
      images: [
        { uri: 'img-1.jpg', alt: 'First image', mimeType: 'image/png' },
        { uri: 'img-2.jpg', alt: '', mimeType: 'image/jpeg' },
      ],
    });
  });

  it('prevents posting while a mutation is pending', async () => {
    const mutateAsync = jest.fn();
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: true });

    const { getByPlaceholderText, getByText } = render(<PostComposer visible onClose={jest.fn()} />);

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('post.postPlaceholder'), 'Pending post');
    });

    const postingText = getByText('post.posting');
    const accessibilityState = findAccessibilityState(postingText.parent ?? null);
    expect(accessibilityState?.disabled).toBe(true);

    await act(async () => {
      fireEvent.press(postingText);
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('handles posting errors gracefully', async () => {
    const error = new Error('fail');
    const mutateAsync = jest.fn().mockRejectedValue(error);
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: false });
    const onClose = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { getByPlaceholderText, getByText } = render(<PostComposer visible onClose={onClose} />);

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('post.postPlaceholder'), 'Error case');
    });

    await act(async () => {
      fireEvent.press(getByText('post.post'));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create post:', error);
    expect(onClose).not.toHaveBeenCalled();
    expect(getByPlaceholderText('post.postPlaceholder').props.value).toBe('Error case');

    consoleErrorSpy.mockRestore();
  });

  it('resets state when pressing cancel', async () => {
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    requestPermissionsMock.mockResolvedValue({ status: 'granted' });
    launchImageLibraryMock.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'img.jpg', mimeType: 'image/jpeg' }],
    });

    const onClose = jest.fn();
    const { getByLabelText, getByPlaceholderText, queryByPlaceholderText, getByText } = render(
      <PostComposer visible onClose={onClose} />,
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('post.postPlaceholder'), 'Something to clear');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });
    fireEvent.press(getByLabelText('gif.addGif'));
    let gifCall = gifPickerMock.mock.calls[gifPickerMock.mock.calls.length - 1][0];
    expect(gifCall.visible).toBe(true);

    await act(async () => {
      fireEvent.press(getByText('common.cancel'));
    });

    expect(onClose).toHaveBeenCalled();
    expect(getByPlaceholderText('post.postPlaceholder').props.value).toBe('');
    expect(queryByPlaceholderText('post.imageAltTextPlaceholder')).toBeNull();

    gifCall = gifPickerMock.mock.calls[gifPickerMock.mock.calls.length - 1][0];
    expect(gifCall.visible).toBe(false);
  });

  it('shows character count warnings near and over limit', () => {
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { getByPlaceholderText, getByText } = render(
      <PostComposer visible onClose={jest.fn()} />,
    );

    const input = getByPlaceholderText('post.postPlaceholder');

    act(() => {
      fireEvent.changeText(input, 'a'.repeat(241));
    });
    expect(extractColor(getByText('241').props.style)).toBe('#FF9500');

    act(() => {
      fireEvent.changeText(input, 'a'.repeat(301));
    });
    expect(extractColor(getByText('301').props.style)).toBe('#FF3B30');
  });

  it('uses height behavior on non-iOS platforms', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { UNSAFE_getByType } = render(<PostComposer visible onClose={jest.fn()} />);
    const keyboardAvoidingView = UNSAFE_getByType(KeyboardAvoidingView);
    expect(keyboardAvoidingView.props.behavior).toBe('height');

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('applies web-specific outline style for text input', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const { UNSAFE_getByType } = render(<PostComposer visible onClose={jest.fn()} />);
    const textInput = UNSAFE_getByType(TextInput);
    expect(hasOutlineNone(textInput.props.style)).toBe(true);

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });
});
