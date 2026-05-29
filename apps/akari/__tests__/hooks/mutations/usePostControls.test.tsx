import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePostControls } from '@/hooks/mutations/usePostControls';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';
import { DEFAULT_POST_CONTROLS, type PostControls } from '@/utils/postControls';

const mockSetThreadgate = jest.fn();
const mockSetPostgate = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('usePostControls mutation hook', () => {
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
      setThreadgate: mockSetThreadgate,
      setPostgate: mockSetPostgate,
    });
    mockSetThreadgate.mockResolvedValue({});
    mockSetPostgate.mockResolvedValue({});
  });

  it('skips both writes when controls are default', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePostControls(), { wrapper });

    result.current.mutate({ postUri: 'at://post', controls: DEFAULT_POST_CONTROLS });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetThreadgate).not.toHaveBeenCalled();
    expect(mockSetPostgate).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['postThread'] });
  });

  it('writes threadgate when reply controls are non-default', async () => {
    const { wrapper } = createWrapper();
    const controls: PostControls = { replyAllow: { type: 'nobody' }, allowQuote: true };
    const { result } = renderHook(() => usePostControls(), { wrapper });

    result.current.mutate({ postUri: 'at://post', controls });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetThreadgate).toHaveBeenCalledWith('token', 'did:me', 'at://post', controls.replyAllow);
    expect(mockSetPostgate).not.toHaveBeenCalled();
  });

  it('writes postgate when allowQuote is non-default', async () => {
    const { wrapper } = createWrapper();
    const controls: PostControls = { replyAllow: { type: 'everyone' }, allowQuote: false };
    const { result } = renderHook(() => usePostControls(), { wrapper });

    result.current.mutate({ postUri: 'at://post', controls });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetPostgate).toHaveBeenCalledWith('token', 'did:me', 'at://post', {
      allowQuote: false,
    });
    expect(mockSetThreadgate).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostControls(), { wrapper });

    result.current.mutate({ postUri: 'at://post', controls: DEFAULT_POST_CONTROLS });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostControls(), { wrapper });

    result.current.mutate({ postUri: 'at://post', controls: DEFAULT_POST_CONTROLS });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostControls(), { wrapper });

    result.current.mutate({ postUri: 'at://post', controls: DEFAULT_POST_CONTROLS });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
