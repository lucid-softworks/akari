import React from 'react';
import { renderHook } from '@testing-library/react-native';

import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

const MUTED_WORDS_PREF_TYPE = 'app.bsky.actor.defs#mutedWordsPref';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useMutedWords hook', () => {
  it('extracts muted words from the mutedWordsPref', () => {
    const items = [{ value: 'spoiler', targets: ['content'] }];
    (usePreferences as jest.Mock).mockReturnValue({
      data: {
        preferences: [
          { $type: 'app.bsky.actor.defs#adultContentPref' },
          { $type: MUTED_WORDS_PREF_TYPE, items },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useMutedWords());

    expect(result.current.data).toEqual(items);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('returns an empty array when there is no mutedWordsPref', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: 'app.bsky.actor.defs#adultContentPref' }] },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useMutedWords());

    expect(result.current.data).toEqual([]);
  });

  it('returns an empty array when preferences are not yet loaded', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { result } = renderHook(() => useMutedWords());

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('survives usePreferences returning undefined (auto-mock guard)', () => {
    (usePreferences as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useMutedWords());

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('propagates the error flag', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    const { result } = renderHook(() => useMutedWords());

    expect(result.current.isError).toBe(true);
  });
});
