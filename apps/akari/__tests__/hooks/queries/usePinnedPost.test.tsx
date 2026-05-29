import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePinnedPost } from '@/hooks/queries/usePinnedPost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { getPostView } from '@/hooks/queries/microcosm';

const mockGetPost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/queries/useAcceptLabelerDids', () => ({
  useAcceptLabelerDids: jest.fn(),
}));

jest.mock('@/hooks/queries/microcosm', () => ({
  getPostView: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ getPost: mockGetPost })),
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
  (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
  (useAppViewEnabled as jest.Mock).mockReturnValue(true);
  (useAcceptLabelerDids as jest.Mock).mockReturnValue(['did:labeler']);
});

describe('usePinnedPost query hook', () => {
  it('resolves the pinned post via the AppView', async () => {
    mockGetPost.mockResolvedValueOnce({ uri: 'at://pinned' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePinnedPost('at://pinned'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetPost).toHaveBeenCalledWith('token', 'at://pinned', ['did:labeler']);
    expect(result.current.data).toEqual({ uri: 'at://pinned' });
  });

  it('resolves via microcosm getPostView when the AppView is disabled', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    (getPostView as jest.Mock).mockResolvedValueOnce({ uri: 'at://pinned-mc' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePinnedPost('at://pinned'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getPostView).toHaveBeenCalledWith('at://pinned');
    expect(mockGetPost).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ uri: 'at://pinned-mc' });
  });

  it('is disabled when no URI is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePinnedPost(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetPost).not.toHaveBeenCalled();
  });

  it('is disabled when AppView enabled but token missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePinnedPost('at://pinned'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
