import { renderHook } from '@testing-library/react-native';

import { useThreadPreferences } from '@/hooks/queries/useThreadPreferences';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

const PREF_TYPE = 'app.bsky.actor.defs#threadViewPref';

describe('useThreadPreferences query hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defaults when there is no data', () => {
    (usePreferences as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useThreadPreferences());

    expect(result.current.data).toEqual({ sort: 'hotness', prioritizeFollowedUsers: false });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns defaults when the pref is absent', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: 'other' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useThreadPreferences());

    expect(result.current.data).toEqual({ sort: 'hotness', prioritizeFollowedUsers: false });
  });

  it('decodes the pref values', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: {
        preferences: [{ $type: PREF_TYPE, sort: 'newest', prioritizeFollowedUsers: true }],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useThreadPreferences());

    expect(result.current.data).toEqual({ sort: 'newest', prioritizeFollowedUsers: true });
  });

  it('falls back to defaults for individual missing fields', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: PREF_TYPE }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useThreadPreferences());

    expect(result.current.data).toEqual({ sort: 'hotness', prioritizeFollowedUsers: false });
  });
});
