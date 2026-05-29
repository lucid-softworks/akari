import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreateLeaflet } from '@/hooks/mutations/useCreateLeaflet';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockFindOrCreatePublication = jest.fn();
const mockCreateDocument = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('useCreateLeaflet mutation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me', handle: 'me.test', displayName: 'Me', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({
      findOrCreateLeafletPublication: mockFindOrCreatePublication,
      createLeafletDocument: mockCreateDocument,
    });
    mockFindOrCreatePublication.mockResolvedValue({ uri: 'at://pub', rkey: 'pubkey' });
    mockCreateDocument.mockResolvedValue({ uri: 'at://doc', rkey: 'dockey' });
  });

  it('creates a leaflet and returns uri + public url, invalidating author caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateLeaflet(), { wrapper });

    result.current.mutate({ title: 'T', body: 'B' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFindOrCreatePublication).toHaveBeenCalledWith('token', 'did:me', { name: 'Me' });
    expect(mockCreateDocument).toHaveBeenCalledWith('token', 'did:me', {
      title: 'T',
      body: 'B',
      publicationUri: 'at://pub',
      author: 'did:me',
    });
    expect(result.current.data).toEqual({
      uri: 'at://doc',
      url: 'https://leaflet.pub/lish/did%3Ame/pubkey/dockey',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['authorFeed', 'did:me'] });
  });

  it('falls back to handle for publication name when no displayName', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me', handle: 'me.test', pdsUrl: 'https://pds' },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateLeaflet(), { wrapper });

    result.current.mutate({ title: 'T', body: 'B' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFindOrCreatePublication).toHaveBeenCalledWith('token', 'did:me', { name: 'me.test' });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateLeaflet(), { wrapper });

    result.current.mutate({ title: 'T', body: 'B' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockFindOrCreatePublication).not.toHaveBeenCalled();
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateLeaflet(), { wrapper });

    result.current.mutate({ title: 'T', body: 'B' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockFindOrCreatePublication).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateLeaflet(), { wrapper });

    result.current.mutate({ title: 'T', body: 'B' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockFindOrCreatePublication).not.toHaveBeenCalled();
  });
});
