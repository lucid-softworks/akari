import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useListMembership } from '@/hooks/mutations/useListMembership';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockAddToList = jest.fn();
const mockRemoveFromList = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    addToList: mockAddToList,
    removeFromList: mockRemoveFromList,
  })),
}));

describe('useListMembership mutation hook', () => {
  let invalidateSpy: jest.SpyInstance;

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    mockAddToList.mockResolvedValue({ uri: 'at://listitem' });
    mockRemoveFromList.mockResolvedValue({});
  });

  it('adds a subject to a list and invalidates snapshots', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useListMembership(), { wrapper });

    result.current.mutate({ action: 'add', listUri: 'at://list', subjectDid: 'did:subject' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockAddToList).toHaveBeenCalledWith('token', 'did:current', 'at://list', 'did:subject');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['listSnapshot', 'https://pds', 'at://list'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['list', 'https://pds', 'at://list'],
    });
  });

  it('removes a subject from a list by listitem uri', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useListMembership(), { wrapper });

    result.current.mutate({
      action: 'remove',
      listItemUri: 'at://listitem',
      listUri: 'at://list',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockRemoveFromList).toHaveBeenCalledWith('token', 'at://listitem');
    expect(mockAddToList).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useListMembership(), { wrapper });

    result.current.mutate({ action: 'add', listUri: 'at://list', subjectDid: 'did:subject' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddToList).not.toHaveBeenCalled();
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useListMembership(), { wrapper });

    result.current.mutate({ action: 'add', listUri: 'at://list', subjectDid: 'did:subject' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddToList).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useListMembership(), { wrapper });

    result.current.mutate({ action: 'add', listUri: 'at://list', subjectDid: 'did:subject' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddToList).not.toHaveBeenCalled();
  });
});
