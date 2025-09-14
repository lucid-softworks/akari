import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockUpdateProfile = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    updateProfile: mockUpdateProfile,
  })),
}));

describe('useUpdateProfile mutation hook', () => {
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
    mockUpdateProfile.mockResolvedValue({});
  });

  it('updates profile successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    result.current.mutate({ displayName: 'name' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUpdateProfile).toHaveBeenCalledWith('token', {
      displayName: 'name',
      description: undefined,
      avatar: undefined,
      banner: undefined,
    });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    result.current.mutate({ displayName: 'name' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

