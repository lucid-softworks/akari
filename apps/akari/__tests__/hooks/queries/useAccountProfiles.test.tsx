import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

const mockGetProfile = jest.fn();
const mockBlueskyApi = jest.fn(() => ({ getProfile: mockGetProfile }));

jest.mock('@/hooks/queries/useAccounts', () => ({
  useAccounts: jest.fn(),
}));

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn((...args) => mockBlueskyApi(...args)),
}));

describe('useAccountProfiles', () => {
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
  });

  it('returns empty object when no accounts', async () => {
    (useAccounts as jest.Mock).mockReturnValue({ data: [] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccountProfiles(), { wrapper });

    let fetched;
    await act(async () => {
      fetched = await result.current.refetch();
    });

    expect(fetched.data).toEqual({});
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('fetches profiles for accounts with PDS URLs', async () => {
    (useAccounts as jest.Mock).mockReturnValue({
      data: [
        {
          did: 'did1',
          handle: 'alice',
          pdsUrl: 'https://pds1',
          jwtToken: 'token1',
        },
        {
          did: 'did2',
          handle: 'bob',
          pdsUrl: 'https://pds2',
          jwtToken: 'token2',
        },
      ],
    });

    mockGetProfile
      .mockResolvedValueOnce({ handle: 'alice' })
      .mockResolvedValueOnce(null);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccountProfiles(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ did1: { handle: 'alice' } });
    });

    expect(mockBlueskyApi).toHaveBeenCalledTimes(2);
    expect(mockBlueskyApi).toHaveBeenNthCalledWith(1, 'https://pds1');
    expect(mockBlueskyApi).toHaveBeenNthCalledWith(2, 'https://pds2');
    expect(mockGetProfile).toHaveBeenNthCalledWith(1, 'token1', 'alice');
    expect(mockGetProfile).toHaveBeenNthCalledWith(2, 'token2', 'bob');
  });

  it('skips accounts without PDS URL', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (useAccounts as jest.Mock).mockReturnValue({
      data: [
        {
          did: 'did1',
          handle: 'alice',
          pdsUrl: undefined,
          jwtToken: 'token1',
        },
        {
          did: 'did2',
          handle: 'bob',
          pdsUrl: 'https://pds2',
          jwtToken: 'token2',
        },
      ],
    });

    mockGetProfile.mockResolvedValueOnce({ handle: 'bob' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccountProfiles(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ did2: { handle: 'bob' } });
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'No PDS URL for account alice, skipping profile fetch',
    );
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('logs error when profile fetch fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (useAccounts as jest.Mock).mockReturnValue({
      data: [
        {
          did: 'did1',
          handle: 'alice',
          pdsUrl: 'https://pds1',
          jwtToken: 'token1',
        },
      ],
    });

    mockGetProfile.mockRejectedValueOnce(new Error('fail'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccountProfiles(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({});
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching profile for alice:',
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});

