import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockBlockUser = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    blockUser: mockBlockUser,
    unblockUser: jest.fn(),
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
  });

  it('blocks a user successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({ did: 'did', action: 'block' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockBlockUser).toHaveBeenCalledWith('token', 'did');
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
});

