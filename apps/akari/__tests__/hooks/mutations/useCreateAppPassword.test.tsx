import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreateAppPassword } from '@/hooks/mutations/useCreateAppPassword';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockCreateAppPassword = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createAppPassword: mockCreateAppPassword,
  })),
}));

describe('useCreateAppPassword mutation hook', () => {
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
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
    mockCreateAppPassword.mockResolvedValue({ name: 'cli', password: 'abcd-1234' });
  });

  it('creates a privileged app password and invalidates the list', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAppPassword(), { wrapper });

    result.current.mutate({ name: 'cli', privileged: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateAppPassword).toHaveBeenCalledWith('token', 'cli', true);
    expect(result.current.data).toEqual({ name: 'cli', password: 'abcd-1234' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appPasswords'] });
  });

  it('defaults privileged to false when omitted', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateAppPassword(), { wrapper });

    result.current.mutate({ name: 'cli' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateAppPassword).toHaveBeenCalledWith('token', 'cli', false);
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCreateAppPassword(), { wrapper });

    result.current.mutate({ name: 'cli' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateAppPassword).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useCreateAppPassword(), { wrapper });

    result.current.mutate({ name: 'cli' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateAppPassword).not.toHaveBeenCalled();
  });
});
