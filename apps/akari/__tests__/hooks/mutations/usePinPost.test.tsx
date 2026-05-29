import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePinPost } from '@/hooks/mutations/usePinPost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockSetPinnedPost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('usePinPost mutation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({ setPinnedPost: mockSetPinnedPost });
    mockSetPinnedPost.mockResolvedValue({});
  });

  it('pins a post and invalidates profile + pinnedPost', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePinPost(), { wrapper });

    result.current.mutate({ action: 'pin', uri: 'at://post', cid: 'cid' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetPinnedPost).toHaveBeenCalledWith('token', 'did:me', {
      uri: 'at://post',
      cid: 'cid',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['profile'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['pinnedPost'] });
  });

  it('unpins a post by passing null', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePinPost(), { wrapper });

    result.current.mutate({ action: 'unpin' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetPinnedPost).toHaveBeenCalledWith('token', 'did:me', null);
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePinPost(), { wrapper });

    result.current.mutate({ action: 'unpin' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSetPinnedPost).not.toHaveBeenCalled();
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePinPost(), { wrapper });

    result.current.mutate({ action: 'unpin' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSetPinnedPost).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePinPost(), { wrapper });

    result.current.mutate({ action: 'unpin' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSetPinnedPost).not.toHaveBeenCalled();
  });
});
