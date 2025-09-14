import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#000');
  mockUseTranslation.mockReturnValue({ t: (k: string) => k });
});

describe('PostComposer', () => {
  it('posts text and closes composer', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseCreatePost.mockReturnValue({ mutateAsync, isPending: false });
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <PostComposer visible onClose={onClose} />,
    );

    fireEvent.changeText(getByPlaceholderText('post.postPlaceholder'), 'Hello');

    await act(async () => {
      fireEvent.press(getByText('post.post'));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ text: 'Hello', replyTo: undefined, images: undefined });
    });
    expect(onClose).toHaveBeenCalled();
    expect(getByPlaceholderText('post.postPlaceholder').props.value).toBe('');
  });

  it('adds and removes images', async () => {
    mockUseCreatePost.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    const requestMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
    const launchMock = ImagePicker.launchImageLibraryAsync as jest.Mock;
    requestMock.mockResolvedValue({ status: 'granted' });
    launchMock.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'img.jpg', mimeType: 'image/jpeg' }],
    });

    const { getByLabelText, getByPlaceholderText, queryByPlaceholderText, getByText } = render(
      <PostComposer visible onClose={jest.fn()} />,
    );

    await act(async () => {
      fireEvent.press(getByLabelText('post.addPhoto'));
    });

    expect(requestMock).toHaveBeenCalled();
    expect(launchMock).toHaveBeenCalled();
    expect(getByPlaceholderText('post.imageAltTextPlaceholder')).toBeTruthy();

    fireEvent.press(getByText('✕'));
    expect(queryByPlaceholderText('post.imageAltTextPlaceholder')).toBeNull();
  });
});
