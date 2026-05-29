import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useOzoneScheduledActions,
  useCancelOzoneScheduledActions,
} from '@/hooks/queries/useOzoneScheduledActions';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const mockListScheduledActions = jest.fn();
const mockCancelScheduledActions = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));

describe('useOzoneScheduledActions hooks', () => {
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
      listScheduledActions: mockListScheduledActions,
      cancelScheduledActions: mockCancelScheduledActions,
    });
  });

  it('lists scheduled actions with the default pending status', async () => {
    mockListScheduledActions.mockResolvedValue({ actions: [{ id: 'a1' }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneScheduledActions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListScheduledActions).toHaveBeenCalledWith('token', 'did:ozone', {
      statuses: ['pending'],
    });
    expect(result.current.data).toEqual([{ id: 'a1' }]);
  });

  it('passes custom statuses through', async () => {
    mockListScheduledActions.mockResolvedValue({ actions: [] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useOzoneScheduledActions(['executed', 'failed']),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListScheduledActions).toHaveBeenCalledWith('token', 'did:ozone', {
      statuses: ['executed', 'failed'],
    });
  });

  it('is disabled when ozoneDid missing', () => {
    (useOzoneDid as jest.Mock).mockReturnValue('');
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneScheduledActions(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListScheduledActions).not.toHaveBeenCalled();
  });

  it('useCancelOzoneScheduledActions cancels and invalidates all ozone queries', async () => {
    mockCancelScheduledActions.mockResolvedValue({});
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCancelOzoneScheduledActions(), { wrapper });

    result.current.mutate({ subjects: ['did:a', 'did:b'], comment: 'stop' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCancelScheduledActions).toHaveBeenCalledWith(
      'token',
      'did:ozone',
      ['did:a', 'did:b'],
      'stop',
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ozone'] });
  });

  it('useCancelOzoneScheduledActions throws when session missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCancelOzoneScheduledActions(), { wrapper });

    result.current.mutate({ subjects: ['did:a'] });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
