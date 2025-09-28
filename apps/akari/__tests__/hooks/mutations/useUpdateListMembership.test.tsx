import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateListMembership } from '@/hooks/mutations/useUpdateListMembership';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockCreateListItem = jest.fn();
const mockDeleteListItem = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createListItem: mockCreateListItem,
    deleteListItem: mockDeleteListItem,
  })),
}));

describe('useUpdateListMembership mutation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper, invalidateSpy };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:viewer' },
    });
    mockCreateListItem.mockResolvedValue({ uri: 'at://listitem/1' });
    mockDeleteListItem.mockResolvedValue({});
  });

  it('creates list membership when action is add', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateListMembership(), { wrapper });

    result.current.mutate({ did: 'did:target', listUri: 'at://list/1', action: 'add' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateListItem).toHaveBeenCalledWith('token', 'at://list/1', 'did:target');
  });

  it('deletes list membership when action is remove', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateListMembership(), { wrapper });

    result.current.mutate({
      did: 'did:target',
      listUri: 'at://list/1',
      action: 'remove',
      listItemUri: 'at://listitem/1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDeleteListItem).toHaveBeenCalledWith('token', 'at://listitem/1');
  });

  it('errors when removing without list item uri', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateListMembership(), { wrapper });

    result.current.mutate({ did: 'did:target', listUri: 'at://list/1', action: 'remove' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockDeleteListItem).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateListMembership(), { wrapper });

    result.current.mutate({ did: 'did:target', listUri: 'at://list/1', action: 'add' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateListItem).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:viewer' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateListMembership(), { wrapper });

    result.current.mutate({ did: 'did:target', listUri: 'at://list/1', action: 'add' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateListItem).not.toHaveBeenCalled();
  });

  it('invalidates relevant queries on success', async () => {
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useUpdateListMembership(), { wrapper });

    result.current.mutate({ did: 'did:target', listUri: 'at://list/1', action: 'add' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile', 'did:target'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['listMemberships', 'did:target'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['viewerLists', 'did:viewer'] });
  });
});
