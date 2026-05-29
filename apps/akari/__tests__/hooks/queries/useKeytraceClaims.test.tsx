import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useKeytraceClaims } from '@/hooks/queries/useKeytraceClaims';
import { getClaimsForHandle } from '@keytrace/claims';

jest.mock('@keytrace/claims', () => ({
  getClaimsForHandle: jest.fn(),
}));

describe('useKeytraceClaims query hook', () => {
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

  it('fetches claims for a handle and selects the claims field', async () => {
    const claims = [{ type: 'github', value: 'alice' }];
    (getClaimsForHandle as jest.Mock).mockResolvedValue({ claims, other: 'x' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useKeytraceClaims('alice.bsky.social'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getClaimsForHandle).toHaveBeenCalledWith('alice.bsky.social');
    expect(result.current.data).toEqual(claims);
  });

  it('is disabled when no handle is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useKeytraceClaims(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getClaimsForHandle).not.toHaveBeenCalled();
  });
});
