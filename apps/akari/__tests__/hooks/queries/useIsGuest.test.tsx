import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));

describe('useIsGuest hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when both account and token are present', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useIsGuest(), { wrapper });

    expect(result.current).toBe(false);
  });

  it('returns true when the account is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: undefined });
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useIsGuest(), { wrapper });

    expect(result.current).toBe(true);
  });

  it('returns true when the token is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useIsGuest(), { wrapper });

    expect(result.current).toBe(true);
  });
});
