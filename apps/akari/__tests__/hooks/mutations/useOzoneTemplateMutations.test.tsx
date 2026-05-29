import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useCreateOzoneTemplate,
  useUpdateOzoneTemplate,
  useDeleteOzoneTemplate,
} from '@/hooks/mutations/useOzoneTemplateMutations';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const mockCreateCommTemplate = jest.fn();
const mockUpdateCommTemplate = jest.fn();
const mockDeleteCommTemplate = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));

describe('useOzoneTemplateMutations hooks', () => {
  const templatesKey = ['ozone', 'templates', 'did:ozone'];

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
      createCommTemplate: mockCreateCommTemplate,
      updateCommTemplate: mockUpdateCommTemplate,
      deleteCommTemplate: mockDeleteCommTemplate,
    });
  });

  it('useCreateOzoneTemplate creates with createdBy and invalidates', async () => {
    mockCreateCommTemplate.mockResolvedValue({ id: 't1' });
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCreateOzoneTemplate(), { wrapper });

    result.current.mutate({ name: 'Hi', contentMarkdown: 'body', lang: 'en' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateCommTemplate).toHaveBeenCalledWith('token', 'did:ozone', {
      name: 'Hi',
      contentMarkdown: 'body',
      lang: 'en',
      createdBy: 'did:current',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: templatesKey });
  });

  it('useCreateOzoneTemplate throws when session missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateOzoneTemplate(), { wrapper });
    result.current.mutate({ name: 'Hi', contentMarkdown: 'body' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useUpdateOzoneTemplate updates with updatedBy and invalidates', async () => {
    mockUpdateCommTemplate.mockResolvedValue({ id: 't1' });
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useUpdateOzoneTemplate(), { wrapper });

    result.current.mutate({ id: 't1', name: 'New', disabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateCommTemplate).toHaveBeenCalledWith('token', 'did:ozone', {
      id: 't1',
      name: 'New',
      disabled: true,
      updatedBy: 'did:current',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: templatesKey });
  });

  it('useUpdateOzoneTemplate throws when PDS missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: undefined } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateOzoneTemplate(), { wrapper });
    result.current.mutate({ id: 't1' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useDeleteOzoneTemplate deletes, returns id, and invalidates', async () => {
    mockDeleteCommTemplate.mockResolvedValue(undefined);
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useDeleteOzoneTemplate(), { wrapper });

    result.current.mutate('t1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteCommTemplate).toHaveBeenCalledWith('token', 'did:ozone', 't1');
    expect(result.current.data).toBe('t1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: templatesKey });
  });

  it('useDeleteOzoneTemplate throws when session missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteOzoneTemplate(), { wrapper });
    result.current.mutate('t1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
