import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useAddConvoMembers,
  useRemoveConvoMembers,
  useUpdateConvoName,
  useMuteConvo,
  useLeaveConvo,
} from '@/hooks/mutations/useGroupConvo';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockAddConvoMembers = jest.fn();
const mockRemoveConvoMembers = jest.fn();
const mockUpdateConvoName = jest.fn();
const mockMuteConvo = jest.fn();
const mockUnmuteConvo = jest.fn();
const mockLeaveConvo = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    addConvoMembers: mockAddConvoMembers,
    removeConvoMembers: mockRemoveConvoMembers,
    updateConvoName: mockUpdateConvoName,
    muteConvo: mockMuteConvo,
    unmuteConvo: mockUnmuteConvo,
    leaveConvo: mockLeaveConvo,
  })),
}));

describe('useGroupConvo mutation hooks', () => {
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
    mockAddConvoMembers.mockResolvedValue({});
    mockRemoveConvoMembers.mockResolvedValue({});
    mockUpdateConvoName.mockResolvedValue({});
    mockMuteConvo.mockResolvedValue({});
    mockUnmuteConvo.mockResolvedValue({});
    mockLeaveConvo.mockResolvedValue({});
  });

  it('adds convo members and invalidates conversation + message caches', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAddConvoMembers(), { wrapper });

    result.current.mutate({ convoId: 'c1', dids: ['did:a', 'did:b'] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockAddConvoMembers).toHaveBeenCalledWith('token', 'c1', ['did:a', 'did:b']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['messages'] });
  });

  it('add convo members errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAddConvoMembers(), { wrapper });

    result.current.mutate({ convoId: 'c1', dids: ['did:a'] });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddConvoMembers).not.toHaveBeenCalled();
  });

  it('add convo members errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAddConvoMembers(), { wrapper });

    result.current.mutate({ convoId: 'c1', dids: ['did:a'] });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddConvoMembers).not.toHaveBeenCalled();
  });

  it('removes convo members', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveConvoMembers(), { wrapper });

    result.current.mutate({ convoId: 'c1', dids: ['did:a'] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockRemoveConvoMembers).toHaveBeenCalledWith('token', 'c1', ['did:a']);
  });

  it('updates convo name', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateConvoName(), { wrapper });

    result.current.mutate({ convoId: 'c1', name: 'New Name' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUpdateConvoName).toHaveBeenCalledWith('token', 'c1', 'New Name');
  });

  it('mutes a conversation', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteConvo(), { wrapper });

    result.current.mutate({ convoId: 'c1', action: 'mute' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockMuteConvo).toHaveBeenCalledWith('token', 'c1');
    expect(mockUnmuteConvo).not.toHaveBeenCalled();
  });

  it('unmutes a conversation', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteConvo(), { wrapper });

    result.current.mutate({ convoId: 'c1', action: 'unmute' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUnmuteConvo).toHaveBeenCalledWith('token', 'c1');
    expect(mockMuteConvo).not.toHaveBeenCalled();
  });

  it('leaves a conversation', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLeaveConvo(), { wrapper });

    result.current.mutate({ convoId: 'c1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockLeaveConvo).toHaveBeenCalledWith('token', 'c1');
  });

  it('every hook errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const remove = renderHook(() => useRemoveConvoMembers(), { wrapper });
    remove.result.current.mutate({ convoId: 'c1', dids: ['did:a'] });
    const rename = renderHook(() => useUpdateConvoName(), { wrapper });
    rename.result.current.mutate({ convoId: 'c1', name: 'x' });
    const mute = renderHook(() => useMuteConvo(), { wrapper });
    mute.result.current.mutate({ convoId: 'c1', action: 'mute' });
    const leave = renderHook(() => useLeaveConvo(), { wrapper });
    leave.result.current.mutate({ convoId: 'c1' });

    await waitFor(() => {
      expect(remove.result.current.isError).toBe(true);
      expect(rename.result.current.isError).toBe(true);
      expect(mute.result.current.isError).toBe(true);
      expect(leave.result.current.isError).toBe(true);
    });
    expect(mockRemoveConvoMembers).not.toHaveBeenCalled();
    expect(mockUpdateConvoName).not.toHaveBeenCalled();
    expect(mockMuteConvo).not.toHaveBeenCalled();
    expect(mockLeaveConvo).not.toHaveBeenCalled();
  });

  it('every hook errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();

    const remove = renderHook(() => useRemoveConvoMembers(), { wrapper });
    remove.result.current.mutate({ convoId: 'c1', dids: ['did:a'] });
    const rename = renderHook(() => useUpdateConvoName(), { wrapper });
    rename.result.current.mutate({ convoId: 'c1', name: 'x' });
    const mute = renderHook(() => useMuteConvo(), { wrapper });
    mute.result.current.mutate({ convoId: 'c1', action: 'unmute' });
    const leave = renderHook(() => useLeaveConvo(), { wrapper });
    leave.result.current.mutate({ convoId: 'c1' });

    await waitFor(() => {
      expect(remove.result.current.isError).toBe(true);
      expect(rename.result.current.isError).toBe(true);
      expect(mute.result.current.isError).toBe(true);
      expect(leave.result.current.isError).toBe(true);
    });
    expect(mockUnmuteConvo).not.toHaveBeenCalled();
  });
});
