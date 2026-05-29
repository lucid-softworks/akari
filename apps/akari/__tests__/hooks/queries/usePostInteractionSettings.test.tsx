import { renderHook } from '@testing-library/react-native';

import { usePostInteractionSettings } from '@/hooks/queries/usePostInteractionSettings';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

const PREF_TYPE = 'app.bsky.actor.defs#postInteractionSettingsPref';

describe('usePostInteractionSettings query hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defaults when there is no preferences data', () => {
    (usePreferences as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => usePostInteractionSettings());

    expect(result.current.data).toEqual({
      mode: 'anyone',
      followers: false,
      following: false,
      mentioned: false,
      allowQuotes: true,
      allowedLists: [],
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns defaults when the pref is absent', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: 'other' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => usePostInteractionSettings());

    expect(result.current.data.mode).toBe('anyone');
    expect(result.current.data.allowQuotes).toBe(true);
  });

  it('decodes an empty allow-rules array as "nobody"', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: { preferences: [{ $type: PREF_TYPE, threadgateAllowRules: [] }] },
      isLoading: false,
    });

    const { result } = renderHook(() => usePostInteractionSettings());

    expect(result.current.data.mode).toBe('nobody');
  });

  it('decodes follower/following/mention/list rules and disabled quotes', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: {
        preferences: [
          {
            $type: PREF_TYPE,
            threadgateAllowRules: [
              { $type: 'app.bsky.feed.threadgate#followerRule' },
              { $type: 'app.bsky.feed.threadgate#followingRule' },
              { $type: 'app.bsky.feed.threadgate#mentionRule' },
              { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
              null,
              { foo: 'no-type' },
            ],
            postgateEmbeddingRules: [{ $type: 'app.bsky.feed.postgate#disableRule' }],
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePostInteractionSettings());

    expect(result.current.data).toEqual({
      mode: 'anyone',
      followers: true,
      following: true,
      mentioned: true,
      allowQuotes: false,
      allowedLists: ['at://list/1'],
    });
  });
});
