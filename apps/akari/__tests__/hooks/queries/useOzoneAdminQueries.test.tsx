import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useSafelinkRules,
  useAddSafelinkRule,
  useRemoveSafelinkRule,
  useOzoneSets,
  useOzoneVerifications,
  useFindRelatedAccounts,
} from '@/hooks/queries/useOzoneAdminQueries';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const mockQuerySafelinkRules = jest.fn();
const mockAddSafelinkRule = jest.fn();
const mockRemoveSafelinkRule = jest.fn();
const mockListSets = jest.fn();
const mockListVerifications = jest.fn();
const mockFindRelatedAccounts = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useOzoneSettings', () => ({
  useOzoneDid: jest.fn(),
}));

jest.mock('@/utils/blueskyOzone', () => ({
  ozoneForAccount: jest.fn(),
}));

describe('useOzoneAdminQueries', () => {
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
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    (useOzoneDid as jest.Mock).mockReturnValue('did:ozone');
    (ozoneForAccount as jest.Mock).mockReturnValue({
      querySafelinkRules: mockQuerySafelinkRules,
      addSafelinkRule: mockAddSafelinkRule,
      removeSafelinkRule: mockRemoveSafelinkRule,
      listSets: mockListSets,
      listVerifications: mockListVerifications,
      findRelatedAccounts: mockFindRelatedAccounts,
    });
  });

  it('useSafelinkRules fetches rules', async () => {
    mockQuerySafelinkRules.mockResolvedValue({ rules: [{ id: 'r1' }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSafelinkRules(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQuerySafelinkRules).toHaveBeenCalledWith('token', 'did:ozone', { limit: 100 });
    expect(result.current.data).toEqual([{ id: 'r1' }]);
  });

  it('useSafelinkRules is disabled without token', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSafelinkRules(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockQuerySafelinkRules).not.toHaveBeenCalled();
  });

  it('useOzoneSets fetches sets', async () => {
    mockListSets.mockResolvedValue({ sets: [{ name: 's1' }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneSets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListSets).toHaveBeenCalledWith('token', 'did:ozone', { limit: 100 });
    expect(result.current.data).toEqual([{ name: 's1' }]);
  });

  it('useOzoneVerifications fetches verifications', async () => {
    mockListVerifications.mockResolvedValue({ verifications: [{ id: 'v1' }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneVerifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListVerifications).toHaveBeenCalledWith('token', 'did:ozone', { limit: 100 });
    expect(result.current.data).toEqual([{ id: 'v1' }]);
  });

  it('useFindRelatedAccounts fetches related accounts', async () => {
    mockFindRelatedAccounts.mockResolvedValue({ accounts: [{ did: 'did:x' }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFindRelatedAccounts('did:target'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFindRelatedAccounts).toHaveBeenCalledWith('token', 'did:ozone', 'did:target');
    expect(result.current.data).toEqual([{ did: 'did:x' }]);
  });

  it('useFindRelatedAccounts is disabled without a did', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFindRelatedAccounts(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFindRelatedAccounts).not.toHaveBeenCalled();
  });

  it('useAddSafelinkRule calls the API with createdBy and invalidates', async () => {
    mockAddSafelinkRule.mockResolvedValue({});
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAddSafelinkRule(), { wrapper });

    result.current.mutate({
      url: 'https://bad',
      pattern: 'domain',
      action: 'block',
      reason: 'spam',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddSafelinkRule).toHaveBeenCalledWith('token', 'did:ozone', {
      url: 'https://bad',
      pattern: 'domain',
      action: 'block',
      reason: 'spam',
      createdBy: 'did:current',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ozone', 'safelink', 'rules'] });
  });

  it('useAddSafelinkRule throws when session missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAddSafelinkRule(), { wrapper });

    result.current.mutate({ url: 'u', pattern: 'url', action: 'warn', reason: 'r' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useRemoveSafelinkRule calls the API and invalidates', async () => {
    mockRemoveSafelinkRule.mockResolvedValue({});
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useRemoveSafelinkRule(), { wrapper });

    result.current.mutate({ url: 'https://bad', pattern: 'domain' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemoveSafelinkRule).toHaveBeenCalledWith('token', 'did:ozone', {
      url: 'https://bad',
      pattern: 'domain',
      createdBy: 'did:current',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ozone', 'safelink', 'rules'] });
  });

  it('useRemoveSafelinkRule throws when PDS missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: undefined } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveSafelinkRule(), { wrapper });

    result.current.mutate({ url: 'u', pattern: 'url' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
