import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled, useAppViewSettings } from '@/hooks/useAppViewSettings';

const mockGetTrendingTopics = jest.fn();

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewEnabled: jest.fn(),
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
  useAppViewSettings: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getTrendingTopics: mockGetTrendingTopics,
  })),
}));

describe('useTrendingTopics query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppViewEnabled as jest.Mock).mockReturnValue(true);
    (readAppViewEnabled as jest.Mock).mockReturnValue(true);
    (useAppViewSettings as jest.Mock).mockReturnValue({
      config: { preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true },
    });
  });

  it('fetches trending topics and unwraps the topics array', async () => {
    const topics = [{ topic: 'news', link: '/search?q=news' }];
    mockGetTrendingTopics.mockResolvedValueOnce({ topics });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTrendingTopics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetTrendingTopics).toHaveBeenCalledWith(12);
    expect(result.current.data).toEqual(topics);
  });

  it('passes a custom limit to the API', async () => {
    mockGetTrendingTopics.mockResolvedValueOnce({ topics: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTrendingTopics(5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetTrendingTopics).toHaveBeenCalledWith(5);
  });

  it('throws AppViewRequiredError when the AppView is disabled', async () => {
    (readAppViewEnabled as jest.Mock).mockReturnValue(false);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTrendingTopics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toContain('trendingTopics');
    expect(mockGetTrendingTopics).not.toHaveBeenCalled();
  });

  it('is disabled when the enabled flag is false', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTrendingTopics(12, false), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetTrendingTopics).not.toHaveBeenCalled();
  });
});
