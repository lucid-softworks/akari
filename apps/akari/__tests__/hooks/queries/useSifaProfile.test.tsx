import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import {
  useSifaSelf,
  useSifaPositions,
  useSifaEducation,
  sortSifaPositions,
  sortSifaEducation,
} from '@/hooks/queries/useSifaProfile';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';

const mockGetSifaProfileSelf = jest.fn();
const mockGetActorSifaPositions = jest.fn();
const mockGetActorSifaEducation = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/usePdsUrl', () => ({
  usePdsUrl: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getSifaProfileSelf: mockGetSifaProfileSelf,
    getActorSifaPositions: mockGetActorSifaPositions,
    getActorSifaEducation: mockGetActorSifaEducation,
  })),
}));

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
  (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: false });
});

describe('useSifaSelf query hook', () => {
  it('reads the sifa self record', async () => {
    mockGetSifaProfileSelf.mockResolvedValueOnce({ uri: 'self' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaSelf('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetSifaProfileSelf).toHaveBeenCalledWith('token', 'alice');
    expect(result.current.data).toEqual({ uri: 'self' });
  });

  it('returns null when the actor has no record', async () => {
    mockGetSifaProfileSelf.mockResolvedValueOnce(null);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaSelf('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
  });

  it('is disabled when there is no token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaSelf('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetSifaProfileSelf).not.toHaveBeenCalled();
  });

  it('is disabled when the PDS URL is missing', async () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaSelf('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetSifaProfileSelf).not.toHaveBeenCalled();
  });
});

describe('useSifaPositions query hook', () => {
  it('fetches positions and flattens pages across fetchNextPage', async () => {
    mockGetActorSifaPositions
      .mockResolvedValueOnce({ records: [{ uri: 'p1' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'p2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaPositions('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorSifaPositions).toHaveBeenCalledWith('token', 'alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'p1' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'p1' }, { uri: 'p2' }]);
    });
    expect(mockGetActorSifaPositions).toHaveBeenLastCalledWith('token', 'alice', 5, 'next');
  });

  it('defaults the limit to 50', async () => {
    mockGetActorSifaPositions.mockResolvedValueOnce({ records: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaPositions('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorSifaPositions).toHaveBeenCalledWith('token', 'alice', 50, undefined);
  });

  it('is disabled when there is no identifier', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaPositions(undefined, 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorSifaPositions).not.toHaveBeenCalled();
  });
});

describe('useSifaEducation query hook', () => {
  it('fetches education and flattens pages across fetchNextPage', async () => {
    mockGetActorSifaEducation
      .mockResolvedValueOnce({ records: [{ uri: 'e1' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'e2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaEducation('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorSifaEducation).toHaveBeenCalledWith('token', 'alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'e1' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'e1' }, { uri: 'e2' }]);
    });
    expect(mockGetActorSifaEducation).toHaveBeenLastCalledWith('token', 'alice', 5, 'next');
  });

  it('is disabled when the PDS URL is still loading', async () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: true });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSifaEducation('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorSifaEducation).not.toHaveBeenCalled();
  });
});

describe('sortSifaPositions helper', () => {
  it('returns an empty array for undefined input', () => {
    expect(sortSifaPositions(undefined)).toEqual([]);
  });

  it('floats primary positions to the top, then sorts by startedAt descending', () => {
    const sorted = sortSifaPositions([
      { uri: 'a', value: { startedAt: '2020-01-01' } },
      { uri: 'b', value: { startedAt: '2022-01-01' } },
      { uri: 'c', value: { isPrimary: true, startedAt: '2018-01-01' } },
    ] as never);
    expect(sorted.map((p) => p.uri)).toEqual(['c', 'b', 'a']);
  });
});

describe('sortSifaEducation helper', () => {
  it('returns an empty array for undefined input', () => {
    expect(sortSifaEducation(undefined)).toEqual([]);
  });

  it('sorts by endedAt (falling back to startedAt) descending', () => {
    const sorted = sortSifaEducation([
      { uri: 'a', value: { endedAt: '2015-01-01' } },
      { uri: 'b', value: { startedAt: '2021-01-01' } }, // still enrolled, uses startedAt
      { uri: 'c', value: { endedAt: '2018-01-01' } },
    ] as never);
    expect(sorted.map((e) => e.uri)).toEqual(['b', 'c', 'a']);
  });
});
