import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';
import { getLibreTranslateClient } from '@/utils/libretranslate';

jest.mock('@/utils/libretranslate', () => {
  const actual = jest.requireActual('@/utils/libretranslate');
  return {
    ...actual,
    getLibreTranslateClient: jest.fn(),
  };
});

describe('usePostTranslation', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('translates text successfully', async () => {
    const translateMock = jest.fn().mockResolvedValue({ status: 200, translatedText: 'Hola mundo' });
    (getLibreTranslateClient as jest.Mock).mockReturnValue({ translate: translateMock });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostTranslation(), { wrapper });

    await expect(result.current.mutateAsync({ text: 'Hello world', targetLanguage: 'es' })).resolves.toEqual({
      translatedText: 'Hola mundo',
    });

    expect(translateMock).toHaveBeenCalledWith('Hello world', 'auto', 'es');
  });

  it('returns empty translation when text is blank', async () => {
    const translateMock = jest.fn();
    (getLibreTranslateClient as jest.Mock).mockReturnValue({ translate: translateMock });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostTranslation(), { wrapper });

    await expect(result.current.mutateAsync({ text: '   ', targetLanguage: 'fr' })).resolves.toEqual({
      translatedText: '',
    });

    expect(translateMock).not.toHaveBeenCalled();
  });

  it('throws an error when translation request fails', async () => {
    const translateMock = jest.fn().mockResolvedValue({ status: 500, error: 'Service unavailable' });
    (getLibreTranslateClient as jest.Mock).mockReturnValue({ translate: translateMock });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostTranslation(), { wrapper });

    await expect(result.current.mutateAsync({ text: 'Hello world', targetLanguage: 'de' })).rejects.toThrow(
      'Service unavailable',
    );
  });
});
