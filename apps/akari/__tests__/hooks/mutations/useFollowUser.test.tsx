import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockFollowUser = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    followUser: mockFollowUser,
    unfollowUser: jest.fn(),
  })),
}));

describe('useFollowUser mutation hook', () => {
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
    mockFollowUser.mockResolvedValue({});
  });

  it('follows a user successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'follow' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockFollowUser).toHaveBeenCalledWith('token', 'did');
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'follow' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

