import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useNotificationPreferences } from '@/hooks/queries/useNotificationPreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';

const mockGetNotificationPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewEnabled: jest.fn(),
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getNotificationPreferences: mockGetNotificationPreferences,
  })),
}));

describe('useNotificationPreferences query hook', () => {
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
    (useAppViewEnabled as jest.Mock).mockReturnValue(true);
    (readAppViewEnabled as jest.Mock).mockReturnValue(true);
  });

  it('fetches notification preferences', async () => {
    const prefs = { chat: { include: 'all' } };
    mockGetNotificationPreferences.mockResolvedValueOnce(prefs);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetNotificationPreferences).toHaveBeenCalledWith('token');
    expect(result.current.data).toEqual(prefs);
  });

  it('throws AppViewRequiredError when the AppView is disabled', async () => {
    (readAppViewEnabled as jest.Mock).mockReturnValue(false);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toContain('notifications');
    expect(mockGetNotificationPreferences).not.toHaveBeenCalled();
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetNotificationPreferences).not.toHaveBeenCalled();
  });

  it('is disabled when pdsUrl is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetNotificationPreferences).not.toHaveBeenCalled();
  });
});
