import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useAuthorRecipes } from '@/hooks/queries/useAuthorRecipes';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';

const mockGetActorRecipes = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/usePdsUrl', () => ({
  usePdsUrl: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getActorRecipes: mockGetActorRecipes,
  })),
}));

describe('useAuthorRecipes query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: false });
  });

  it('fetches recipes and flattens pages across fetchNextPage', async () => {
    mockGetActorRecipes
      .mockResolvedValueOnce({ records: [{ uri: 'r1' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'r2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRecipes('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorRecipes).toHaveBeenCalledWith('token', 'alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'r1' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'r1' }, { uri: 'r2' }]);
    });
    expect(mockGetActorRecipes).toHaveBeenLastCalledWith('token', 'alice', 5, 'next');
  });

  it('defaults the limit to 50', async () => {
    mockGetActorRecipes.mockResolvedValueOnce({ records: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRecipes('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorRecipes).toHaveBeenCalledWith('token', 'alice', 50, undefined);
  });

  it('is disabled when there is no token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRecipes('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRecipes).not.toHaveBeenCalled();
  });

  it('is disabled when there is no identifier', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRecipes(undefined, 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRecipes).not.toHaveBeenCalled();
  });

  it('is disabled when the PDS URL is still loading', async () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: true });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRecipes('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRecipes).not.toHaveBeenCalled();
  });
});
