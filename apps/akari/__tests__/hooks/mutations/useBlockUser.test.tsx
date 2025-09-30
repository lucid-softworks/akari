import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockBlockUser = jest.fn();
const mockUnblockUser = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    blockUser: mockBlockUser,
    unblockUser: mockUnblockUser,
  })),
}));

describe('useBlockUser mutation hook', () => {
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
      data: { pdsUrl: 'https://pds' },
    });
    mockBlockUser.mockResolvedValue({});
    mockUnblockUser.mockResolvedValue({});
  });

  it('blocks a user successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'block' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockBlockUser).toHaveBeenCalledWith('did');
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'block' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('unblocks a user successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({
      did: 'did',
      blockUri: 'block-uri',
      action: 'unblock',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUnblockUser).toHaveBeenCalledWith('block-uri');
  });

  it('errors when blockUri missing for unblock', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'unblock' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: undefined } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'block' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

