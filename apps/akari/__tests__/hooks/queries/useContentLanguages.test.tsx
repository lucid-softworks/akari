import { renderHook } from '@testing-library/react-native';

import { useContentLanguages } from '@/hooks/queries/useContentLanguages';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

const PREF_TYPE = 'app.bsky.actor.defs#contentLanguagesPref';

describe('useContentLanguages query hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty list when there is no data', () => {
    (usePreferences as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useContentLanguages());

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns an empty list when the pref is absent', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: 'other' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useContentLanguages());

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns the languages from the pref', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: PREF_TYPE, languages: ['en', 'ja'] }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useContentLanguages());

    expect(result.current.data).toEqual(['en', 'ja']);
  });
});
