import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useStartConvo } from '@/hooks/mutations/useStartConvo';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetConvoForMembers = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getConvoForMembers: mockGetConvoForMembers,
  })),
}));

describe('useStartConvo mutation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper, invalidateSpy };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    mockGetConvoForMembers.mockResolvedValue({ convo: { id: 'convo-1' } });
  });

  it('resolves a conversation and returns the convo view', async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useStartConvo(), { wrapper });

    result.current.mutate({ memberDids: ['did:peer'] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetConvoForMembers).toHaveBeenCalledWith('token', ['did:peer']);
    expect(result.current.data).toEqual({ id: 'convo-1' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations'] });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStartConvo(), { wrapper });

    result.current.mutate({ memberDids: ['did:peer'] });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetConvoForMembers).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStartConvo(), { wrapper });

    result.current.mutate({ memberDids: ['did:peer'] });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetConvoForMembers).not.toHaveBeenCalled();
  });

  it('errors when no member dids provided', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStartConvo(), { wrapper });

    result.current.mutate({ memberDids: [] });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetConvoForMembers).not.toHaveBeenCalled();
  });
});
