import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetTrendingTopics = jest.fn();
const mockBlueskyApiConstructor = jest.fn();
const useQueryMock = useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => {
  const MockBlueskyApi = jest.fn().mockImplementation((baseUrl: string) => {
    mockBlueskyApiConstructor(baseUrl);

    return {
      getTrendingTopics: mockGetTrendingTopics,
    };
  });

  return {
    __esModule: true,
    BlueskyApi: MockBlueskyApi,
    default: MockBlueskyApi,
  };
});

describe('useTrendingTopics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds.example' },
    });
    useQueryMock.mockImplementation((config) => ({
      data: undefined,
      ...config,
    }));
  });

  it('fetches trending topics from the Bluesky API', async () => {
    const topics = [{ topic: '#hello', link: '/search?q=%23hello' }];
    mockGetTrendingTopics.mockResolvedValueOnce({ topics });

    let capturedConfig: Parameters<typeof useQueryMock>[0] | undefined;
    useQueryMock.mockImplementation((config) => {
      capturedConfig = config;
      return { data: topics };
    });

    renderHook(() => useTrendingTopics(6));

    expect(capturedConfig?.queryKey).toEqual(['trendingTopics', 6, 'https://pds.example']);
    const result = await capturedConfig?.queryFn?.();
    expect(result).toEqual(topics);
    expect(mockGetTrendingTopics).toHaveBeenCalledWith(6);
    expect(mockBlueskyApiConstructor).toHaveBeenCalledWith('https://pds.example');
  });

  it('uses the public appview API when no PDS URL is available', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: undefined });
    const topics = [{ topic: '#news', link: '/search?q=%23news' }];
    mockGetTrendingTopics.mockResolvedValueOnce({ topics });

    let capturedConfig: Parameters<typeof useQueryMock>[0] | undefined;
    useQueryMock.mockImplementation((config) => {
      capturedConfig = config;
      return { data: topics };
    });

    renderHook(() => useTrendingTopics());

    expect(capturedConfig?.queryKey).toEqual(['trendingTopics', 10, undefined]);
    const result = await capturedConfig?.queryFn?.();
    expect(result).toEqual(topics);
    expect(mockBlueskyApiConstructor).toHaveBeenCalledWith('https://public.api.bsky.app');
  });

  it('returns an empty array when the API request fails', async () => {
    const originalDev = (globalThis as unknown as { __DEV__?: boolean }).__DEV__;
    (globalThis as unknown as { __DEV__?: boolean }).__DEV__ = true;
    mockGetTrendingTopics.mockRejectedValueOnce(new Error('network failure'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let capturedConfig: Parameters<typeof useQueryMock>[0] | undefined;
    useQueryMock.mockImplementation((config) => {
      capturedConfig = config;
      return { data: [] };
    });

    renderHook(() => useTrendingTopics());

    const result = await capturedConfig?.queryFn?.();
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load trending topics', expect.any(Error));
    warnSpy.mockRestore();
    (globalThis as unknown as { __DEV__?: boolean }).__DEV__ = originalDev;
  });
});

