import { renderHook } from '@testing-library/react-native';

import { useInterests } from '@/hooks/queries/useInterests';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

const PREF_TYPE = 'app.bsky.actor.defs#interestsPref';

describe('useInterests query hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty list when there is no data', () => {
    (usePreferences as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useInterests());

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns an empty list when the pref is absent', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: 'other' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useInterests());

    expect(result.current.data).toEqual([]);
  });

  it('returns the tags from the pref', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: PREF_TYPE, tags: ['art', 'tech'] }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useInterests());

    expect(result.current.data).toEqual(['art', 'tech']);
  });
});
