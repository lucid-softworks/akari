import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useOzoneLabelOptions } from '@/hooks/queries/useOzoneLabelOptions';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { apiForAccount } from '@/utils/blueskyApi';

const mockGetLabelerServices = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

const FALLBACK_TAGS = ['auto-flagged', 'repeat-offender', 'reviewed', 'needs-translation'];

describe('useOzoneLabelOptions hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
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
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    (useOzoneDid as jest.Mock).mockReturnValue('did:ozone');
    (apiForAccount as jest.Mock).mockReturnValue({
      getLabelerServices: mockGetLabelerServices,
    });
  });

  it('returns labeler-provided label values plus fallback tags', async () => {
    mockGetLabelerServices.mockResolvedValue({
      views: [{ policies: { labelValues: ['spam', 'porn'] } }],
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneLabelOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetLabelerServices).toHaveBeenCalledWith('token', ['did:ozone'], true);
    expect(result.current.data).toEqual({ labels: ['spam', 'porn'], tags: FALLBACK_TAGS });
  });

  it('falls back to default labels when the labeler returns none', async () => {
    mockGetLabelerServices.mockResolvedValue({ views: [{ policies: { labelValues: [] } }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneLabelOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.labels).toContain('spam');
    expect(result.current.data?.labels.length).toBeGreaterThan(0);
    expect(result.current.data?.tags).toEqual(FALLBACK_TAGS);
  });

  it('falls back to defaults when the API call throws', async () => {
    mockGetLabelerServices.mockRejectedValue(new Error('network'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneLabelOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.labels).toContain('impersonation');
    expect(result.current.data?.tags).toEqual(FALLBACK_TAGS);
  });

  it('is disabled when ozoneDid missing', () => {
    (useOzoneDid as jest.Mock).mockReturnValue('');
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneLabelOptions(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetLabelerServices).not.toHaveBeenCalled();
  });
});
