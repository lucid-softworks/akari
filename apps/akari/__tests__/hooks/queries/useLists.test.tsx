import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useLists, useListMembership } from '@/hooks/queries/useLists';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import {
  getActorListsPage,
  resolveIdentifierToDid,
  resolvePdsUrl,
} from '@/hooks/queries/microcosm';

const mockGetLists = jest.fn();

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
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/hooks/queries/microcosm', () => ({
  getActorListsPage: jest.fn(),
  resolveIdentifierToDid: jest.fn(),
  resolvePdsUrl: jest.fn(),
}));

const mockGetList = jest.fn();

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getLists: mockGetLists,
    getList: mockGetList,
  })),
}));

describe('useLists query hook', () => {
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
  });

  it('fetches lists through the AppView for an explicit actor', async () => {
    const response = { lists: [{ uri: 'at://list/1' }], cursor: undefined };
    mockGetLists.mockResolvedValueOnce(response);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists('did:actor'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetLists).toHaveBeenCalledWith('token', 'did:actor', 50, undefined);
    expect(result.current.data?.pages[0]).toEqual(response);
  });

  it('defaults to the current user did when no actor is given', async () => {
    mockGetLists.mockResolvedValueOnce({ lists: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetLists).toHaveBeenCalledWith('token', 'did:me', 50, undefined);
  });

  it('uses the known PDS for the current user on the microcosm path', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    (resolveIdentifierToDid as jest.Mock).mockResolvedValueOnce('did:me');
    const response = { lists: [{ uri: 'at://list/1' }], cursor: undefined };
    (getActorListsPage as jest.Mock).mockResolvedValueOnce(response);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists('did:me'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(resolvePdsUrl).not.toHaveBeenCalled();
    expect(getActorListsPage).toHaveBeenCalledWith({
      did: 'did:me',
      pdsUrl: 'https://pds',
      limit: 50,
      cursor: undefined,
    });
    expect(mockGetLists).not.toHaveBeenCalled();
    expect(result.current.data?.pages[0]).toEqual(response);
  });

  it('resolves the PDS via DID document for other actors on the microcosm path', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    (resolveIdentifierToDid as jest.Mock).mockResolvedValueOnce('did:other');
    (resolvePdsUrl as jest.Mock).mockResolvedValueOnce('https://other-pds');
    (getActorListsPage as jest.Mock).mockResolvedValueOnce({ lists: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists('did:other'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(resolvePdsUrl).toHaveBeenCalledWith('did:other');
    expect(getActorListsPage).toHaveBeenCalledWith({
      did: 'did:other',
      pdsUrl: 'https://other-pds',
      limit: 50,
      cursor: undefined,
    });
  });

  it('errors when the PDS cannot be resolved on the microcosm path', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    (resolveIdentifierToDid as jest.Mock).mockResolvedValueOnce('did:other');
    (resolvePdsUrl as jest.Mock).mockResolvedValueOnce(undefined);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists('did:other'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toContain("Couldn't resolve PDS URL");
  });

  it('is disabled when there is no target', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetLists).not.toHaveBeenCalled();
  });

  it('is disabled when token is missing and AppView enabled', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLists('did:actor'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetLists).not.toHaveBeenCalled();
  });
});

describe('useListMembership', () => {
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
  });

  it('reports membership and the listitem uri when the subject is found', async () => {
    mockGetList.mockResolvedValueOnce({
      items: [
        { uri: 'at://listitem/1', subject: { did: 'did:subject' } },
        { uri: 'at://listitem/2', subject: { did: 'did:other' } },
      ],
      cursor: undefined,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useListMembership('at://list/1', 'did:subject'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isMember).toBe(true);
    });
    expect(mockGetList).toHaveBeenCalledWith('token', 'at://list/1', 50, undefined);
    expect(result.current.listItemUri).toBe('at://listitem/1');
    expect(result.current.isLoading).toBe(false);
  });

  it('walks pages until the subject is found', async () => {
    mockGetList
      .mockResolvedValueOnce({
        items: [{ uri: 'at://listitem/1', subject: { did: 'did:other' } }],
        cursor: 'next',
      })
      .mockResolvedValueOnce({
        items: [{ uri: 'at://listitem/2', subject: { did: 'did:subject' } }],
        cursor: undefined,
      });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useListMembership('at://list/1', 'did:subject'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isMember).toBe(true);
    });
    expect(result.current.listItemUri).toBe('at://listitem/2');
    expect(mockGetList).toHaveBeenCalledTimes(2);
  });

  it('reports no membership when the subject is absent and pages are exhausted', async () => {
    mockGetList.mockResolvedValueOnce({
      items: [{ uri: 'at://listitem/1', subject: { did: 'did:other' } }],
      cursor: undefined,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useListMembership('at://list/1', 'did:subject'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isMember).toBe(false);
    expect(result.current.listItemUri).toBeUndefined();
  });

  it('is not a member when no subject is provided', async () => {
    mockGetList.mockResolvedValueOnce({
      items: [{ uri: 'at://listitem/1', subject: { did: 'did:other' } }],
      cursor: undefined,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useListMembership('at://list/1', undefined),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isMember).toBe(false);
    expect(result.current.listItemUri).toBeUndefined();
  });

  it('is disabled when no list uri is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useListMembership(undefined, 'did:subject'),
      { wrapper },
    );

    expect(result.current.isMember).toBe(false);
    expect(mockGetList).not.toHaveBeenCalled();
  });
});
