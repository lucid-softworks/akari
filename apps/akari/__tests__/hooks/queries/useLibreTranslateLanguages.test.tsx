import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useLibreTranslateLanguages } from '@/hooks/queries/useLibreTranslateLanguages';
import { DEFAULT_LIBRETRANSLATE_LANGUAGES, getLibreTranslateClient } from '@/utils/libretranslate';

jest.mock('@/utils/libretranslate', () => {
  const actual = jest.requireActual('@/utils/libretranslate');
  return {
    ...actual,
    getLibreTranslateClient: jest.fn(),
  };
});

describe('useLibreTranslateLanguages', () => {
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

  it('returns languages from the API when available', async () => {
    const listLanguagesMock = jest
      .fn()
      .mockResolvedValue([{ code: 'en', name: 'English', targets: [] }]);
    (getLibreTranslateClient as jest.Mock).mockReturnValue({ listLanguages: listLanguagesMock });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLibreTranslateLanguages(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      languages: [{ code: 'en', name: 'English', targets: [] }],
      isFallback: false,
    });
  });

  it('returns fallback languages when the API call fails', async () => {
    const listLanguagesMock = jest.fn().mockRejectedValue(new Error('boom'));
    (getLibreTranslateClient as jest.Mock).mockReturnValue({ listLanguages: listLanguagesMock });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLibreTranslateLanguages(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      languages: DEFAULT_LIBRETRANSLATE_LANGUAGES,
      isFallback: true,
    });

    warnSpy.mockRestore();
  });

  it('returns fallback languages when the API returns an empty list', async () => {
    const listLanguagesMock = jest.fn().mockResolvedValue([]);
    (getLibreTranslateClient as jest.Mock).mockReturnValue({ listLanguages: listLanguagesMock });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLibreTranslateLanguages(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      languages: DEFAULT_LIBRETRANSLATE_LANGUAGES,
      isFallback: true,
    });
  });
});
