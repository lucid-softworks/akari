import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSignIn } from '@/hooks/mutations/useSignIn';

const mockSetAuth = { mutateAsync: jest.fn() };
const mockCreateSession = jest.fn();

jest.mock('@/hooks/mutations/useSetAuthentication', () => ({
  useSetAuthentication: jest.fn(() => mockSetAuth),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createSession: mockCreateSession,
  })),
}));

describe('useSignIn mutation hook', () => {
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
    mockCreateSession.mockResolvedValue({
      accessJwt: 'token',
      refreshJwt: 'refresh',
      did: 'did',
      handle: 'handle',
    });
  });

  it('signs in and stores auth data', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSignIn(), { wrapper });

    result.current.mutate({ identifier: 'user', password: 'pass', pdsUrl: 'url' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateSession).toHaveBeenCalledWith('user', 'pass');
    expect(mockSetAuth.mutateAsync).toHaveBeenCalledWith({
      token: 'token',
      refreshToken: 'refresh',
      did: 'did',
      handle: 'handle',
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });
});

