import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useEmitOzoneEvent } from '@/hooks/mutations/useEmitOzoneEvent';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const mockEmitEvent = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));

describe('useEmitOzoneEvent hook', () => {
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
    (ozoneForAccount as jest.Mock).mockReturnValue({ emitEvent: mockEmitEvent });
  });

  it('emits an event defaulting createdBy to the current DID and invalidates ozone', async () => {
    mockEmitEvent.mockResolvedValue({ id: 1 });
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useEmitOzoneEvent(), { wrapper });

    const input = {
      event: { $type: 'tools.ozone.moderation.defs#modEventComment', comment: 'hi' },
      subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:s' },
    };
    result.current.mutate(input as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEmitEvent).toHaveBeenCalledWith('token', 'did:ozone', {
      ...input,
      createdBy: 'did:current',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ozone'] });
  });

  it('honours an explicit createdBy', async () => {
    mockEmitEvent.mockResolvedValue({ id: 2 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useEmitOzoneEvent(), { wrapper });

    const input = {
      event: { $type: 'x' },
      subject: { did: 'did:s' },
      createdBy: 'did:explicit',
    } as never;
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEmitEvent).toHaveBeenCalledWith(
      'token',
      'did:ozone',
      expect.objectContaining({ createdBy: 'did:explicit' }),
    );
  });

  it('throws when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useEmitOzoneEvent(), { wrapper });

    result.current.mutate({ event: { $type: 'x' }, subject: {} } as never);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  it('throws when no current DID and no explicit createdBy', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useEmitOzoneEvent(), { wrapper });

    result.current.mutate({ event: { $type: 'x' }, subject: {} } as never);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });
});
