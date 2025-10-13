import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePost, useParentPost, useRootPost } from '@/hooks/queries/usePost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetPost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
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
});

describe('usePost', () => {
  it('fetches a post', async () => {
    mockGetPost.mockResolvedValueOnce({ uri: 'at://post/1' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePost({ actor: 'post', rKey: '1' }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ uri: 'at://post/1' });
    });
    expect(mockGetPost).toHaveBeenCalledWith('token', 'at://post/app.bsky.feed.post/1');
  });

  it('returns error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePost({ actor: 'post', rKey: '1' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetPost).not.toHaveBeenCalled();
  });

  it('returns error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePost({ actor: 'post', rKey: '1' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetPost).not.toHaveBeenCalled();
  });

  it('does not run query without actor or rKey', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePost({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetPost).not.toHaveBeenCalled();
  });
});

describe('useParentPost', () => {
  it('fetches a parent post', async () => {
    mockGetPost.mockResolvedValueOnce({ uri: 'at://parent' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useParentPost('at://parent'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ uri: 'at://parent' });
    });
    expect(mockGetPost).toHaveBeenCalledWith('token', 'at://parent');
  });

  it('returns error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useParentPost('at://parent'), { wrapper });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('No access token');
    });
  });

  it('returns error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useParentPost('at://parent'), { wrapper });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('No PDS URL available');
    });
  });

  it('does not run query without parent URI', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useParentPost(null), { wrapper });

    await waitFor(() => {
      expect(result.current.parentPost).toBeUndefined();
    });
    expect(mockGetPost).not.toHaveBeenCalled();
  });
});

describe('useRootPost', () => {
  it('fetches a root post', async () => {
    mockGetPost.mockResolvedValueOnce({ uri: 'at://root' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRootPost('at://root'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ uri: 'at://root' });
    });
    expect(mockGetPost).toHaveBeenCalledWith('token', 'at://root');
  });

  it('returns error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRootPost('at://root'), { wrapper });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('No access token');
    });
  });

  it('returns error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRootPost('at://root'), { wrapper });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('No PDS URL available');
    });
  });

  it('does not run query without root URI', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRootPost(null), { wrapper });

    await waitFor(() => {
      expect(result.current.rootPost).toBeUndefined();
    });
    expect(mockGetPost).not.toHaveBeenCalled();
  });
});

