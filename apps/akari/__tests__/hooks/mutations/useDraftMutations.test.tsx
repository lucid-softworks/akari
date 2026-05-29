import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useCreateDraft,
  useUpdateDraft,
  useDeleteDraft,
} from '@/hooks/mutations/useDraftMutations';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';
import { DEFAULT_POST_CONTROLS } from '@/utils/postControls';
import type { ComposerDraftState } from '@/utils/draftMapper';

const mockCreateDraft = jest.fn();
const mockUpdateDraft = jest.fn();
const mockDeleteDraft = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

const PAYLOAD = {
  posts: [{ text: 'hello', images: [] }],
  controls: DEFAULT_POST_CONTROLS,
};

describe('draft mutation hooks', () => {
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
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({
      createDraft: mockCreateDraft,
      updateDraft: mockUpdateDraft,
      deleteDraft: mockDeleteDraft,
    });
    mockCreateDraft.mockResolvedValue({ id: 'draft-1' });
    mockUpdateDraft.mockResolvedValue(undefined);
    mockDeleteDraft.mockResolvedValue(undefined);
  });

  describe('useCreateDraft', () => {
    it('creates a draft and invalidates drafts cache', async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateDraft(), { wrapper });

      result.current.mutate(PAYLOAD);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateDraft).toHaveBeenCalledWith('token', expect.objectContaining({ posts: expect.any(Array) }));
      expect(result.current.data).toMatchObject({ id: 'draft-1', posts: PAYLOAD.posts });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['drafts', 'did:me'] });
    });

    it('errors when not authenticated', async () => {
      (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateDraft(), { wrapper });

      result.current.mutate(PAYLOAD);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockCreateDraft).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateDraft', () => {
    it('updates a draft and invalidates drafts cache', async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateDraft(), { wrapper });

      result.current.mutate({ id: 'draft-1', ...PAYLOAD });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateDraft).toHaveBeenCalledWith('token', 'draft-1', expect.any(Object));
      expect(spy).toHaveBeenCalledWith({ queryKey: ['drafts', 'did:me'] });
    });

    it('errors when not authenticated', async () => {
      (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateDraft(), { wrapper });

      result.current.mutate({ id: 'draft-1', ...PAYLOAD });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockUpdateDraft).not.toHaveBeenCalled();
    });
  });

  describe('useDeleteDraft', () => {
    it('optimistically removes the draft and deletes it on the server', async () => {
      const { queryClient, wrapper } = createWrapper();
      const drafts: ComposerDraftState[] = [
        { id: 'd1', posts: [], controls: DEFAULT_POST_CONTROLS, createdAt: '', updatedAt: '' },
        { id: 'd2', posts: [], controls: DEFAULT_POST_CONTROLS, createdAt: '', updatedAt: '' },
      ];
      queryClient.setQueryData(['drafts', 'did:me'], drafts);

      const { result } = renderHook(() => useDeleteDraft(), { wrapper });
      result.current.mutate({ id: 'd1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteDraft).toHaveBeenCalledWith('token', 'd1');
      expect(
        queryClient.getQueryData<ComposerDraftState[]>(['drafts', 'did:me'])?.map((d) => d.id),
      ).toEqual(['d2']);
    });

    it('rolls back optimistic removal on error', async () => {
      const { queryClient, wrapper } = createWrapper();
      const drafts: ComposerDraftState[] = [
        { id: 'd1', posts: [], controls: DEFAULT_POST_CONTROLS, createdAt: '', updatedAt: '' },
      ];
      queryClient.setQueryData(['drafts', 'did:me'], drafts);
      mockDeleteDraft.mockRejectedValueOnce(new Error('fail'));

      const { result } = renderHook(() => useDeleteDraft(), { wrapper });
      result.current.mutate({ id: 'd1' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(
        queryClient.getQueryData<ComposerDraftState[]>(['drafts', 'did:me'])?.map((d) => d.id),
      ).toEqual(['d1']);
    });

    it('errors when not authenticated', async () => {
      (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteDraft(), { wrapper });

      result.current.mutate({ id: 'd1' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockDeleteDraft).not.toHaveBeenCalled();
    });
  });
});
