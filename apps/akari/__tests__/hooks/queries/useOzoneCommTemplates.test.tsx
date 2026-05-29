import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useOzoneCommTemplates } from '@/hooks/queries/useOzoneCommTemplates';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const mockListCommTemplates = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));

describe('useOzoneCommTemplates hook', () => {
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
    (ozoneForAccount as jest.Mock).mockReturnValue({
      listCommTemplates: mockListCommTemplates,
    });
  });

  it('lists communication templates', async () => {
    mockListCommTemplates.mockResolvedValue({
      communicationTemplates: [{ id: 't1', name: 'Welcome' }],
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneCommTemplates(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListCommTemplates).toHaveBeenCalledWith('token', 'did:ozone');
    expect(result.current.data).toEqual([{ id: 't1', name: 'Welcome' }]);
  });

  it('is disabled when ozoneDid missing', () => {
    (useOzoneDid as jest.Mock).mockReturnValue('');
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneCommTemplates(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListCommTemplates).not.toHaveBeenCalled();
  });

  it('is disabled without a token', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneCommTemplates(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
