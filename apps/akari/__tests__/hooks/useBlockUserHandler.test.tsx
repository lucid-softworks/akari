import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useBlockUserHandler } from '@/hooks/useBlockUserHandler';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

jest.mock('@/hooks/mutations/useBlockUser');
jest.mock('@/contexts/ToastContext');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/alert');

describe('useBlockUserHandler', () => {
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
    (useBlockUser as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue(undefined) });
    (useToast as jest.Mock).mockReturnValue({ showToast: jest.fn(), hideToast: jest.fn() });
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string, params?: Record<string, string>) =>
        params?.handle ? `${key}:${params.handle}` : key,
    });
    (showAlert as jest.Mock).mockImplementation(({ buttons }) => {
      const confirmButton = buttons?.find((button: any) => button.style === 'destructive');
      confirmButton?.onPress?.();
    });
  });

  it('blocks a user and invalidates profile queries', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useBlockUserHandler(), { wrapper });
    const blockUserMockResults = (useBlockUser as jest.Mock).mock.results;
    const blockUserInstance = blockUserMockResults[blockUserMockResults.length - 1]?.value as {
      mutateAsync: jest.Mock;
    } | undefined;
    if (!blockUserInstance) {
      throw new Error('useBlockUser mock was not invoked');
    }
    const mutateAsync = blockUserInstance.mutateAsync;

    await act(async () => {
      result.current.handleBlockPress({
        did: 'did:example:123',
        handle: 'alice',
        onSuccess,
      });
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        did: 'did:example:123',
        blockUri: undefined,
        action: 'block',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['profile', 'alice'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['profile', 'did:example:123'] }),
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.block',
        message: 'profile.blockConfirmation:alice',
      }),
    );
  });

  it('unblocks a user and shows error toast when mutation fails', async () => {
    const { wrapper } = createWrapper();
    const error = new Error('nope');
    const mutateAsync = jest.fn().mockRejectedValue(error);
    (useBlockUser as jest.Mock).mockReturnValueOnce({ mutateAsync });
    const showToastMock = jest.fn();
    (useToast as jest.Mock).mockReturnValueOnce({ showToast: showToastMock, hideToast: jest.fn() });
    const { result } = renderHook(() => useBlockUserHandler(), { wrapper });

    await act(async () => {
      result.current.handleBlockPress({
        did: 'did:example:999',
        handle: 'bob',
        blockingUri: 'at://block/123',
      });
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        did: 'did:example:999',
        blockUri: 'at://block/123',
        action: 'unblock',
      });
    });

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'common.unblock',
        message: 'common.somethingWentWrong',
      }),
    );
  });
});

