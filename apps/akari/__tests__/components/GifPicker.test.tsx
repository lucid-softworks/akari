import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { GifPicker } from '@/components/GifPicker';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tenorApi } from '@/utils/tenor';

jest.mock('@/utils/tenor', () => ({
  tenorApi: {
    getTrendingGifs: jest.fn(),
    searchGifs: jest.fn(),
    convertGifToAttachedImage: jest.fn(),
  },
}));

jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));

describe('GifPicker', () => {
  const mockUseThemeColor = useThemeColor as jest.Mock;
  const mockUseTranslation = useTranslation as jest.Mock;
  const mockTenor = tenorApi as jest.Mocked<typeof tenorApi>;

  const sampleGif = {
    id: '1',
    title: 'funny',
    media_formats: {
      gif: { url: 'https://example.com/1.gif', dims: [1, 1], size: 1 },
    },
    created: 0,
    content_description: 'desc',
    itemurl: 'item',
    url: 'https://example.com/1.gif',
    tags: [],
    flags: [],
    hasaudio: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockTenor.getTrendingGifs.mockResolvedValue({ results: [sampleGif], next: undefined });
    mockTenor.searchGifs.mockResolvedValue({ results: [sampleGif], next: undefined });
    mockTenor.convertGifToAttachedImage.mockReturnValue({
      uri: 'converted',
      alt: 'alt',
      mimeType: 'image/gif',
      tenorId: '1',
    });
  });

  it('loads trending GIFs and handles selection', async () => {
    const onSelectGif = jest.fn();
    const onClose = jest.fn();
    const { findAllByRole } = render(
      <GifPicker visible onClose={onClose} onSelectGif={onSelectGif} />,
    );

    await waitFor(() => expect(mockTenor.getTrendingGifs).toHaveBeenCalledWith(20));

    const buttons = await findAllByRole('button');
    fireEvent.press(buttons[1]);

    expect(mockTenor.convertGifToAttachedImage).toHaveBeenCalledWith(sampleGif);
    expect(onSelectGif).toHaveBeenCalledWith({
      uri: 'converted',
      alt: 'alt',
      mimeType: 'image/gif',
      tenorId: '1',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('searches for GIFs on query input', async () => {
    const { getByPlaceholderText } = render(
      <GifPicker visible onClose={jest.fn()} onSelectGif={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText('gif.searchPlaceholder'), 'cats');

    await waitFor(() => expect(mockTenor.searchGifs).toHaveBeenCalledWith('cats', 20));
  });

  it('shows error message when trending load fails', async () => {
    mockTenor.getTrendingGifs.mockRejectedValueOnce(new Error('fail'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { findByText } = render(
      <GifPicker visible onClose={jest.fn()} onSelectGif={jest.fn()} />,
    );

    expect(await findByText('gif.apiError')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('reloads trending GIFs when search is cleared', async () => {
    const { getByPlaceholderText } = render(
      <GifPicker visible onClose={jest.fn()} onSelectGif={jest.fn()} />,
    );

    const input = getByPlaceholderText('gif.searchPlaceholder');
    await waitFor(() => expect(mockTenor.getTrendingGifs).toHaveBeenCalledTimes(1));

    fireEvent.changeText(input, 'cats');
    await waitFor(() => expect(mockTenor.searchGifs).toHaveBeenCalledWith('cats', 20));
    expect(mockTenor.getTrendingGifs).toHaveBeenCalledTimes(1);

    fireEvent.changeText(input, '');
    await waitFor(() => expect(mockTenor.getTrendingGifs).toHaveBeenCalledTimes(2));
    expect(mockTenor.searchGifs).toHaveBeenCalledTimes(1);
  });

  it('shows error message when search fails', async () => {
    mockTenor.searchGifs.mockRejectedValueOnce(new Error('search fail'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByPlaceholderText, findByText } = render(
      <GifPicker visible onClose={jest.fn()} onSelectGif={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText('gif.searchPlaceholder'), 'dogs');
    expect(await findByText('gif.apiError')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('calls onClose when cancel pressed', async () => {
    const onClose = jest.fn();
    const { findByRole } = render(
      <GifPicker visible onClose={onClose} onSelectGif={jest.fn()} />,
    );

    const cancel = await findByRole('button', { name: 'common.cancel' });
    fireEvent.press(cancel);
    expect(onClose).toHaveBeenCalled();
  });
});
