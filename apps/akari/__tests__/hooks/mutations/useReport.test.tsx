import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useReport } from '@/hooks/mutations/useReport';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockCreateReport = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createReport: mockCreateReport,
  })),
}));

describe('useReport mutation hook', () => {
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
    mockCreateReport.mockResolvedValue({});
  });

  it('reports an account and invalidates the profile', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReport(), { wrapper });

    result.current.mutate({
      subject: { type: 'account', did: 'did:bad' },
      reasonType: 'reasonSpam',
      reason: 'spammy',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateReport).toHaveBeenCalledWith(
      'token',
      { did: 'did:bad' },
      'reasonSpam',
      'spammy',
      undefined,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile', 'did:bad'] });
  });

  it('reports a post and invalidates post + thread caches', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReport(), { wrapper });

    result.current.mutate({
      subject: { type: 'post', uri: 'at://post', cid: 'cid' },
      reasonType: 'reasonViolation',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateReport).toHaveBeenCalledWith(
      'token',
      { uri: 'at://post', cid: 'cid' },
      'reasonViolation',
      undefined,
      undefined,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['post'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['postThread'] });
  });

  it('forwards a labeler did for an appeal', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReport(), { wrapper });

    result.current.mutate({
      subject: { type: 'account', did: 'did:bad' },
      reasonType: 'reasonAppeal',
      labelerDid: 'did:labeler',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateReport).toHaveBeenCalledWith(
      'token',
      { did: 'did:bad' },
      'reasonAppeal',
      undefined,
      'did:labeler',
    );
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReport(), { wrapper });

    result.current.mutate({
      subject: { type: 'account', did: 'did:bad' },
      reasonType: 'reasonSpam',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateReport).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReport(), { wrapper });

    result.current.mutate({
      subject: { type: 'account', did: 'did:bad' },
      reasonType: 'reasonSpam',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateReport).not.toHaveBeenCalled();
  });
});
