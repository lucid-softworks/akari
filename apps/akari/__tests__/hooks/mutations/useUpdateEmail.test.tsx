import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateEmail } from '@/hooks/mutations/useUpdateEmail';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockUpdateEmail = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    updateEmail: mockUpdateEmail,
  })),
}));

describe('useUpdateEmail mutation hook', () => {
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
    mockUpdateEmail.mockResolvedValue(undefined);
  });

  it('updates the email with a confirmation token and invalidates session', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateEmail(), { wrapper });

    result.current.mutate({ email: 'new@b.com', token: 'email-token' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUpdateEmail).toHaveBeenCalledWith('token', 'new@b.com', 'email-token');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session'] });
  });

  it('updates the email without a token', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateEmail(), { wrapper });

    result.current.mutate({ email: 'new@b.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUpdateEmail).toHaveBeenCalledWith('token', 'new@b.com', undefined);
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useUpdateEmail(), { wrapper });

    result.current.mutate({ email: 'new@b.com' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockUpdateEmail).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useUpdateEmail(), { wrapper });

    result.current.mutate({ email: 'new@b.com' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockUpdateEmail).not.toHaveBeenCalled();
  });
});
