import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  buildAiPreferencesRecord,
  useUpdateAiPreferences,
} from '@/hooks/mutations/useUpdateAiPreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockPutAiPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    putAiPreferences: mockPutAiPreferences,
  })),
}));

const queryKey = ['aiPreferences', 'did', 'https://pds'];

describe('useUpdateAiPreferences mutation hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did', pdsUrl: 'https://pds' } });
    mockPutAiPreferences.mockResolvedValue(undefined);
  });

  it('writes the record and stores it in the cache on success', async () => {
    const { wrapper, queryClient } = createWrapper();
    const record = buildAiPreferencesRecord({ training: true }, null);
    const { result } = renderHook(() => useUpdateAiPreferences(), { wrapper });

    result.current.mutate(record);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutAiPreferences).toHaveBeenCalledWith('token', 'did', record);
    expect(queryClient.getQueryData(queryKey)).toEqual(record);
    expect(result.current.data).toEqual(record);
  });

  it('rolls back to the previous cache value on error', async () => {
    const { wrapper, queryClient } = createWrapper();
    const previous = buildAiPreferencesRecord({ embedding: true }, null);
    queryClient.setQueryData(queryKey, previous);
    mockPutAiPreferences.mockRejectedValueOnce(new Error('fail'));
    const next = buildAiPreferencesRecord({ embedding: false }, null);
    const { result } = renderHook(() => useUpdateAiPreferences(), { wrapper });

    result.current.mutate(next);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(queryClient.getQueryData(queryKey)).toEqual(previous);
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateAiPreferences(), { wrapper });

    result.current.mutate(buildAiPreferencesRecord({}, null));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockPutAiPreferences).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateAiPreferences(), { wrapper });

    result.current.mutate(buildAiPreferencesRecord({}, null));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockPutAiPreferences).not.toHaveBeenCalled();
  });

  it('errors when DID missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateAiPreferences(), { wrapper });

    result.current.mutate(buildAiPreferencesRecord({}, null));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockPutAiPreferences).not.toHaveBeenCalled();
  });
});

describe('buildAiPreferencesRecord helper', () => {
  it('defaults every category to opt-out when no current record', () => {
    const record = buildAiPreferencesRecord({}, null);
    expect(record.$type).toBe('community.lexicon.preference.ai');
    expect(record.preferences.embedding.allow).toBe(false);
    expect(record.preferences.inference.allow).toBe(false);
    expect(record.preferences.syntheticContent.allow).toBe(false);
    expect(record.preferences.training.allow).toBe(false);
    expect(record.scope).toEqual({ $type: 'community.lexicon.preference.ai#globalScope' });
  });

  it('layers changes on top of the existing record', () => {
    const current = buildAiPreferencesRecord({ training: true, embedding: true }, null);
    const record = buildAiPreferencesRecord({ embedding: false }, current);
    expect(record.preferences.training.allow).toBe(true);
    expect(record.preferences.embedding.allow).toBe(false);
  });

  it('skips change keys whose value is undefined', () => {
    const current = buildAiPreferencesRecord({ training: true }, null);
    const record = buildAiPreferencesRecord({ training: undefined }, current);
    // undefined change is a no-op; the existing flag survives.
    expect(record.preferences.training.allow).toBe(true);
  });
});
