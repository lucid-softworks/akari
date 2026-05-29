import { renderHook } from '@testing-library/react-native';

import { useSavedFeedsList } from '@/hooks/useSavedFeedsList';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeeds } from '@/hooks/queries/useFeeds';
import { useSavedFeeds } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/useFeeds', () => ({
  useFeeds: jest.fn(),
}));

jest.mock('@/hooks/queries/usePreferences', () => ({
  useSavedFeeds: jest.fn(),
}));

describe('useSavedFeedsList', () => {
  const refetchFeeds = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:plc:me', handle: 'me.test', pdsUrl: 'https://pds' },
    });
    (useSavedFeeds as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    (useFeeds as jest.Mock).mockReturnValue({
      data: { feeds: [] },
      isLoading: false,
      refetch: refetchFeeds,
    });
  });

  it('passes the current account did and limit 50 to useFeeds', () => {
    renderHook(() => useSavedFeedsList());
    expect(useFeeds as jest.Mock).toHaveBeenCalledWith('did:plc:me', 50);
  });

  it('expands the synthetic following timeline entry into a feed-shaped record', () => {
    (useSavedFeeds as jest.Mock).mockReturnValue({
      data: [{ type: 'timeline', value: 'following' }],
      isLoading: false,
    });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.allFeedsWithCreated).toHaveLength(1);
    const following = result.current.allFeedsWithCreated[0];
    expect(following.uri).toBe('following');
    expect(following.displayName).toBe('Following');
    expect(following.creator.did).toBe('did:plc:me');
    expect(following.creator.handle).toBe('me.test');
  });

  it('uses empty strings for the following creator when no account is present', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: undefined });
    (useSavedFeeds as jest.Mock).mockReturnValue({
      data: [{ type: 'timeline', value: 'following' }],
      isLoading: false,
    });
    (useFeeds as jest.Mock).mockReturnValue({
      data: { feeds: [] },
      isLoading: false,
      refetch: refetchFeeds,
    });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.allFeedsWithCreated[0].creator.did).toBe('');
    expect(result.current.allFeedsWithCreated[0].creator.handle).toBe('');
  });

  it('passes through feed metadata for saved feed entries', () => {
    const metadata = { uri: 'at://feed/abc', displayName: 'Cool Feed' };
    (useSavedFeeds as jest.Mock).mockReturnValue({
      data: [{ type: 'feed', metadata }],
      isLoading: false,
    });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.allFeedsWithCreated).toEqual([metadata]);
  });

  it('drops feed entries lacking metadata and unknown timeline values', () => {
    (useSavedFeeds as jest.Mock).mockReturnValue({
      data: [
        { type: 'feed', metadata: undefined },
        { type: 'timeline', value: 'whats-hot' },
      ],
      isLoading: false,
    });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.allFeedsWithCreated).toHaveLength(0);
  });

  it('concatenates created feeds after the saved feeds', () => {
    const metadata = { uri: 'at://feed/saved', displayName: 'Saved' };
    const created = { uri: 'at://feed/created', displayName: 'Created' };
    (useSavedFeeds as jest.Mock).mockReturnValue({
      data: [{ type: 'feed', metadata }],
      isLoading: false,
    });
    (useFeeds as jest.Mock).mockReturnValue({
      data: { feeds: [created] },
      isLoading: false,
      refetch: refetchFeeds,
    });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.allFeedsWithCreated).toEqual([metadata, created]);
  });

  it('surfaces loading flags and the refetch function', () => {
    (useSavedFeeds as jest.Mock).mockReturnValue({ data: [], isLoading: true });
    (useFeeds as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: refetchFeeds,
    });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.savedFeedsLoading).toBe(true);
    expect(result.current.feedsLoading).toBe(true);
    expect(result.current.refetchFeeds).toBe(refetchFeeds);
  });

  it('handles undefined savedFeeds without throwing', () => {
    (useSavedFeeds as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    const { result } = renderHook(() => useSavedFeedsList());
    expect(result.current.allFeedsWithCreated).toEqual([]);
  });
});
