import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useProfile } from '@/hooks/queries/useProfile';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetProfile = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ getProfile: mockGetProfile })),
}));

describe('useProfile query hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('fetches profile when identifier and token are provided', async () => {
    mockGetProfile.mockResolvedValueOnce({ handle: 'alice' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ handle: 'alice' });
    });

    expect(mockGetProfile).toHaveBeenCalledWith('token', 'alice');
  });

  it('errors when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('alice'), { wrapper });

    let fetched;
    await act(async () => {
      fetched = await result.current.refetch();
    });

    expect(fetched.error?.message).toBe('No access token');
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('errors when identifier is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile(undefined), { wrapper });

    let fetched;
    await act(async () => {
      fetched = await result.current.refetch();
    });

    expect(fetched.error?.message).toBe('No identifier provided');
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('errors when PDS URL is missing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('No PDS URL available');
    expect(mockGetProfile).not.toHaveBeenCalled();
    (console.error as jest.Mock).mockRestore();
  });
});

