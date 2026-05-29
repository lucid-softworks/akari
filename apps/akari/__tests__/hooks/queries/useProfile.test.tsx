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

    // Authenticated AppView path: real token plus the resolved accept-labelers
    // list (empty when the user has no labeler preferences).
    expect(mockGetProfile).toHaveBeenCalledWith('token', 'alice', []);
  });

  it('uses the public AppView (guest path) when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    mockGetProfile.mockResolvedValueOnce({ handle: 'alice' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ handle: 'alice' });
    });
    // Guest path passes an empty auth string.
    expect(mockGetProfile).toHaveBeenCalledWith('', 'alice', []);
  });

  it('uses the public AppView (guest path) when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    mockGetProfile.mockResolvedValueOnce({ handle: 'alice' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ handle: 'alice' });
    });
    expect(mockGetProfile).toHaveBeenCalledWith('', 'alice', []);
  });

  it('errors when identifier is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile(undefined), { wrapper });

    let fetched;
    await act(async () => {
      fetched = await result.current.refetch();
    });

    expect(fetched!.error?.message).toBe('No identifier provided');
    expect(mockGetProfile).not.toHaveBeenCalled();
  });
});
