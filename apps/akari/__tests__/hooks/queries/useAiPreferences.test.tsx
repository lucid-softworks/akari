import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAiPreferences } from '@/hooks/queries/useAiPreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetAiPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getAiPreferences: mockGetAiPreferences,
  })),
}));

describe('useAiPreferences query hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
  });

  it('fetches the AI preferences record', async () => {
    const record = { value: { allowAi: true } };
    mockGetAiPreferences.mockResolvedValueOnce(record);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAiPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetAiPreferences).toHaveBeenCalledWith('token', 'did:me');
    expect(result.current.data).toEqual(record);
  });

  it('returns null for accounts without a record', async () => {
    mockGetAiPreferences.mockResolvedValueOnce(null);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAiPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAiPreferences(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetAiPreferences).not.toHaveBeenCalled();
  });

  it('is disabled when did is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAiPreferences(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetAiPreferences).not.toHaveBeenCalled();
  });
});
