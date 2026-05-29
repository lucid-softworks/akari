import { renderHook } from '@testing-library/react-native';

import { usePersonalDetails } from '@/hooks/queries/usePersonalDetails';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

const PREF_TYPE = 'app.bsky.actor.defs#personalDetailsPref';

describe('usePersonalDetails query hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined birthDate when there is no data', () => {
    (usePreferences as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => usePersonalDetails());

    expect(result.current.birthDate).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns undefined when the pref is absent', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: 'other' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => usePersonalDetails());

    expect(result.current.birthDate).toBeUndefined();
  });

  it('returns the birthDate from the pref', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: PREF_TYPE, birthDate: '1990-01-01' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => usePersonalDetails());

    expect(result.current.birthDate).toBe('1990-01-01');
  });
});
