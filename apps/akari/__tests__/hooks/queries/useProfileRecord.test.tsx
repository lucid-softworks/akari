import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useProfileRecord,
  isLoggedOutVisibilityDiscouraged,
  isAccountAutomated,
} from '@/hooks/queries/useProfileRecord';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetProfileRecord = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getProfileRecord: mockGetProfileRecord,
  })),
}));

describe('useProfileRecord query hook', () => {
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
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
  });

  it('fetches the profile record for the current user', async () => {
    const record = { uri: 'at://record', value: { labels: undefined } };
    mockGetProfileRecord.mockResolvedValueOnce(record);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProfileRecord(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetProfileRecord).toHaveBeenCalledWith('token', 'did:me');
    expect(result.current.data).toEqual(record);
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProfileRecord(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProfileRecord).not.toHaveBeenCalled();
  });

  it('is disabled when pdsUrl is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProfileRecord(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProfileRecord).not.toHaveBeenCalled();
  });

  it('is disabled when did is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useProfileRecord(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProfileRecord).not.toHaveBeenCalled();
  });
});

describe('isLoggedOutVisibilityDiscouraged', () => {
  it('returns true when the !no-unauthenticated self-label is present', () => {
    const record = {
      value: { labels: { values: [{ val: '!no-unauthenticated' }] } },
    };
    expect(isLoggedOutVisibilityDiscouraged(record)).toBe(true);
  });

  it('returns false when the label is absent', () => {
    expect(isLoggedOutVisibilityDiscouraged({ value: { labels: { values: [{ val: 'other' }] } } })).toBe(false);
  });

  it('returns false for null, missing labels, or missing values', () => {
    expect(isLoggedOutVisibilityDiscouraged(null)).toBe(false);
    expect(isLoggedOutVisibilityDiscouraged(undefined)).toBe(false);
    expect(isLoggedOutVisibilityDiscouraged({ value: {} })).toBe(false);
    expect(isLoggedOutVisibilityDiscouraged({ value: { labels: {} } })).toBe(false);
  });
});

describe('isAccountAutomated', () => {
  it('returns true when the automated self-label is present', () => {
    const record = { value: { labels: { values: [{ val: 'automated' }] } } };
    expect(isAccountAutomated(record)).toBe(true);
  });

  it('returns false when the label is absent', () => {
    expect(isAccountAutomated({ value: { labels: { values: [{ val: 'other' }] } } })).toBe(false);
  });
});
