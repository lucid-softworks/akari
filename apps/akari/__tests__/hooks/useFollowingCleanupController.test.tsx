import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFollowingCleanupController } from '@/hooks/useFollowingCleanupController';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useToast } from '@/contexts/ToastContext';
import { apiForAccount } from '@/utils/blueskyApi';
import {
  getFollowingCleanupController,
  initialFollowingCleanupState,
} from '@/utils/followingCleanupController';

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/mutations/useFollowUser', () => ({ useFollowUser: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));
jest.mock('@/utils/followingCleanupController', () => ({
  getFollowingCleanupController: jest.fn(),
  followingCleanupQueryKey: (did: string | undefined) => ['followingCleanup', did],
  initialFollowingCleanupState: jest.fn(() => ({
    entries: {},
    totalDiscovered: 0,
    totalScanned: 0,
    paginationDone: false,
    runState: 'idle',
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

type Ctrl = {
  getState: jest.Mock;
  start: jest.Mock;
  pause: jest.Mock;
  clear: jest.Mock;
  removeProfile: jest.Mock;
  restoreEntry: jest.Mock;
};

function makeController(): Ctrl {
  return {
    getState: jest.fn(() => initialFollowingCleanupState()),
    start: jest.fn(() => Promise.resolve()),
    pause: jest.fn(),
    clear: jest.fn(),
    removeProfile: jest.fn(),
    restoreEntry: jest.fn(),
  };
}

describe('useFollowingCleanupController', () => {
  const mutate = jest.fn();
  let controller: Ctrl;
  let showToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = makeController();
    (getFollowingCleanupController as jest.Mock).mockReturnValue(controller);
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:plc:me', pdsUrl: 'https://pds' },
    });
    (useFollowUser as jest.Mock).mockReturnValue({ mutate, isPending: false });
    (apiForAccount as jest.Mock).mockReturnValue({ id: 'api' });
    showToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ showToast, hideToast: jest.fn() });
  });

  it('exposes account context, initial state and pending flag', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    expect(result.current.accountDid).toBe('did:plc:me');
    expect(result.current.token).toBe('token');
    expect(result.current.state.runState).toBe('idle');
    expect(result.current.unfollowPending).toBe(false);
  });

  it('start() invokes the controller with the api and token', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.start();
    });

    expect(apiForAccount).toHaveBeenCalledWith({ did: 'did:plc:me', pdsUrl: 'https://pds' });
    expect(controller.start).toHaveBeenCalledWith({ api: { id: 'api' }, token: 'token' });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('start() shows an error toast and bails when credentials are missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.start();
    });

    expect(controller.start).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({ type: 'error', message: 'common.somethingWentWrong' });
  });

  it('start() surfaces a toast and logs if the controller scan rejects', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    controller.start.mockReturnValue(Promise.reject(new Error('boom')));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    await act(async () => {
      result.current.start();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({ type: 'error', message: 'common.somethingWentWrong' });
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('pause() and clear() delegate to the controller', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.pause();
      result.current.clear();
    });

    expect(controller.pause).toHaveBeenCalledTimes(1);
    expect(controller.clear).toHaveBeenCalledTimes(1);
  });

  it('pause() and clear() no-op when there is no account did', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.pause();
      result.current.clear();
    });

    expect(controller.pause).not.toHaveBeenCalled();
    expect(controller.clear).not.toHaveBeenCalled();
  });

  it('unfollow() optimistically removes the profile and fires the mutation', () => {
    const profile = {
      did: 'did:plc:target',
      viewer: { following: 'at://follow/uri' },
    } as never;
    controller.getState.mockReturnValue({
      ...initialFollowingCleanupState(),
      entries: { 'did:plc:target': { profile, status: 'done', lastActivityAt: null, followedAt: null } },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.unfollow(profile);
    });

    expect(controller.removeProfile).toHaveBeenCalledWith('did:plc:target');
    expect(mutate).toHaveBeenCalledWith(
      { did: 'did:plc:target', followUri: 'at://follow/uri', action: 'unfollow' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('unfollow() restores the entry and toasts on mutation error', () => {
    const previousEntry = {
      profile: { did: 'did:plc:target' },
      status: 'done',
      lastActivityAt: null,
      followedAt: null,
    };
    const profile = {
      did: 'did:plc:target',
      viewer: { following: 'at://follow/uri' },
    } as never;
    controller.getState.mockReturnValue({
      ...initialFollowingCleanupState(),
      entries: { 'did:plc:target': previousEntry },
    });
    mutate.mockImplementation((_vars, opts) => opts.onError());

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.unfollow(profile);
    });

    expect(controller.restoreEntry).toHaveBeenCalledWith(previousEntry);
    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'settings.followingCleanup.unfollowFailed',
    });
  });

  it('unfollow() shows an error and bails when there is no follow uri', () => {
    const profile = { did: 'did:plc:target', viewer: {} } as never;
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    act(() => {
      result.current.unfollow(profile);
    });

    expect(mutate).not.toHaveBeenCalled();
    expect(controller.removeProfile).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'settings.followingCleanup.unfollowFailed',
    });
  });

  it('reconciles cached state with the live controller on mount', async () => {
    const liveState = {
      ...initialFollowingCleanupState(),
      runState: 'paused' as const,
      entries: { 'did:plc:x': { profile: { did: 'did:plc:x' }, status: 'done', lastActivityAt: null, followedAt: null } },
    };
    controller.getState.mockReturnValue(liveState);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingCleanupController(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.runState).toBe('paused');
    });
    expect(result.current.state.entries['did:plc:x']).toBeDefined();
  });
});
