import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSuggestedFollows } from '@/hooks/queries/useSuggestedFollows';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';

const mockGetSuggestions = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/useAcceptLabelerDids', () => ({
  useAcceptLabelerDids: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ getSuggestions: mockGetSuggestions })),
}));

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
  (useAcceptLabelerDids as jest.Mock).mockReturnValue(['did:labeler']);
});

describe('useSuggestedFollows query hook', () => {
  it('fetches suggestions and dedupes actors by DID', async () => {
    mockGetSuggestions.mockResolvedValueOnce({
      actors: [
        { did: 'did:a' },
        { did: 'did:a' },
        { did: 'did:b' },
        { did: undefined },
      ],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSuggestedFollows(7), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetSuggestions).toHaveBeenCalledWith('token', {
      limit: 7,
      acceptLabelers: ['did:labeler'],
    });
    expect(result.current.data).toEqual([{ did: 'did:a' }, { did: 'did:b' }]);
  });

  it('respects the enabled flag', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSuggestedFollows(5, false), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSuggestedFollows(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });
});
