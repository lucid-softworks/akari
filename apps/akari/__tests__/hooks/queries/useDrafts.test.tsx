import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useDrafts } from '@/hooks/queries/useDrafts';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForPdsUrl } from '@/utils/blueskyApi';
import { draftViewToComposerState } from '@/utils/draftMapper';

const mockGetDrafts = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForPdsUrl: jest.fn() }));
jest.mock('@/utils/draftMapper', () => ({ draftViewToComposerState: jest.fn() }));

describe('useDrafts query hook', () => {
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
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (apiForPdsUrl as jest.Mock).mockReturnValue({ getDrafts: mockGetDrafts });
    (draftViewToComposerState as jest.Mock).mockImplementation((v) => v);
  });

  it('fetches drafts and sorts them newest-first by updatedAt', async () => {
    mockGetDrafts.mockResolvedValue({
      drafts: [
        { id: '1', updatedAt: '2024-01-01T00:00:00Z' },
        { id: '2', updatedAt: '2024-03-01T00:00:00Z' },
        { id: '3', updatedAt: '2024-02-01T00:00:00Z' },
      ],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDrafts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(apiForPdsUrl).toHaveBeenCalledWith('https://pds');
    expect(mockGetDrafts).toHaveBeenCalledWith('token', { limit: 100 });
    expect(result.current.data?.map((d) => d.id)).toEqual(['2', '3', '1']);
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDrafts(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDrafts).not.toHaveBeenCalled();
  });

  it('is disabled when the enabled flag is false', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDrafts(false), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDrafts).not.toHaveBeenCalled();
  });

  it('is disabled when pdsUrl or did is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDrafts(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDrafts).not.toHaveBeenCalled();
  });
});
