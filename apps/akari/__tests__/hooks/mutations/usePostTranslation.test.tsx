import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';

// Production no longer uses the LibreTranslate client wrapper — it calls
// `fetch('https://translate.akari.blue/', ...)` directly. Mock global fetch
// for these tests instead.
const originalFetch = global.fetch;
let fetchMock: jest.Mock;

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
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it('translates text successfully', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: 'Hola mundo', detectedLanguage: { language: 'en' } }),
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostTranslation(), { wrapper });

    await expect(result.current.mutateAsync({ text: 'Hello world', targetLanguage: 'es' })).resolves.toEqual({
      translatedText: 'Hola mundo',
      detectedLanguage: 'en',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://translate.akari.blue/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ q: 'Hello world', source: 'auto', target: 'es' }),
      }),
    );
  });

  it('returns empty translation when text is blank', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostTranslation(), { wrapper });

    await expect(result.current.mutateAsync({ text: '   ', targetLanguage: 'fr' })).resolves.toEqual({
      translatedText: '',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws an error when translation request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Service unavailable' }),
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostTranslation(), { wrapper });

    await expect(result.current.mutateAsync({ text: 'Hello world', targetLanguage: 'de' })).rejects.toThrow(
      'Translation failed',
    );
  });
});
