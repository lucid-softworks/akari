import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePreferences } from '@/hooks/queries/usePreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getPreferences: mockGetPreferences,
  })),
}));

describe('usePreferences query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
  });

  it('fetches user preferences', async () => {
    const preferencesResponse = { preferences: [{ $type: 'test' }] };
    mockGetPreferences.mockResolvedValue(preferencesResponse);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetPreferences).toHaveBeenCalledWith('token');
    expect(result.current.data).toEqual(preferencesResponse);
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePreferences(), { wrapper });

    const fetchResult = await result.current.refetch();
    expect((fetchResult.error as Error).message).toBe('No access token');
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  it('throws error when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePreferences(), { wrapper });

    const fetchResult = await result.current.refetch();
    expect((fetchResult.error as Error).message).toBe('No PDS URL available');
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });
});

