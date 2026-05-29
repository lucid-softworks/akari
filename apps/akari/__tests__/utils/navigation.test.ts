import { router, usePathname } from 'expo-router';
import { Platform } from 'react-native';

import {
  useNavigateToFeed,
  useNavigateToGallery,
  useNavigateToPost,
  useNavigateToProfile,
  useProfileHref,
} from '@/utils/navigation';

// jest.setup.js installs a manual mock for @/utils/navigation (so component
// tests get a stub). This suite exercises the real implementation, so opt out.
jest.unmock('@/utils/navigation');

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  usePathname: jest.fn(),
}));

const originalPlatform = Platform.OS;

/** Set the value usePathname() returns for the hook under test. */
function mockPathname(pathname: string) {
  (usePathname as jest.Mock).mockReturnValue(pathname);
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = originalPlatform;
});

afterAll(() => {
  Platform.OS = originalPlatform;
});

describe('useNavigateToPost', () => {
  it('uses the top-level profile route on web', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test/post/abc');
  });

  it('encodes actor and rKey', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    useNavigateToPost()({ actor: 'did:plc:a/b', rKey: 'r k' });
    expect(router.push).toHaveBeenCalledWith(
      `/profile/${encodeURIComponent('did:plc:a/b')}/post/${encodeURIComponent('r k')}`,
    );
  });

  it('uses the profile tab route on native when on the profile tab', () => {
    Platform.OS = 'ios';
    mockPathname('/profile/me.test');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test/post/abc');
  });

  it('uses the collapsed user-profile route on native when on the index tab (root)', () => {
    Platform.OS = 'ios';
    mockPathname('/');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test/post/abc');
  });

  it('treats /index paths as the index tab', () => {
    Platform.OS = 'ios';
    mockPathname('/index/something');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test/post/abc');
  });

  it('treats collapsed /user-profile paths as the index tab', () => {
    Platform.OS = 'ios';
    mockPathname('/user-profile/bob.test');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test/post/abc');
  });

  it('strips the (tabs) group prefix when detecting the tab', () => {
    Platform.OS = 'ios';
    mockPathname('/(tabs)/notifications');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/notifications/user-profile/alice.test/post/abc');
  });

  it('uses the per-tab variant for non-index, non-profile tabs', () => {
    Platform.OS = 'ios';
    mockPathname('/search/results');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/search/user-profile/alice.test/post/abc');
  });

  it('falls back to the index tab for unknown pathnames', () => {
    Platform.OS = 'ios';
    mockPathname('/totally-unknown');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test/post/abc');
  });

  it('does not push when already on the same path (isSamePath guard)', () => {
    Platform.OS = 'web';
    mockPathname('/profile/alice.test/post/abc');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('ignores query strings and hashes when comparing paths', () => {
    Platform.OS = 'web';
    mockPathname('/profile/alice.test/post/abc?ref=x#top');
    useNavigateToPost()({ actor: 'alice.test', rKey: 'abc' });
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('useNavigateToProfile', () => {
  it('uses the top-level profile route on web', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    useNavigateToProfile()({ actor: 'alice.test' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test');
  });

  it('uses the profile tab route on native when on the profile tab', () => {
    Platform.OS = 'ios';
    mockPathname('/profile/me.test');
    useNavigateToProfile()({ actor: 'alice.test' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test');
  });

  it('uses the collapsed user-profile route on native when on the index tab', () => {
    Platform.OS = 'ios';
    mockPathname('/');
    useNavigateToProfile()({ actor: 'alice.test' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test');
  });

  it('uses the per-tab variant for other tabs', () => {
    Platform.OS = 'ios';
    mockPathname('/messages/convo');
    useNavigateToProfile()({ actor: 'alice.test' });
    expect(router.push).toHaveBeenCalledWith('/messages/user-profile/alice.test');
  });

  it('does not push when already on the same profile path', () => {
    Platform.OS = 'web';
    mockPathname('/profile/alice.test');
    useNavigateToProfile()({ actor: 'alice.test' });
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('useProfileHref', () => {
  it('returns the top-level profile href on web', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    expect(useProfileHref()('alice.test')).toBe('/profile/alice.test');
  });

  it('returns the profile tab href when on the profile tab', () => {
    Platform.OS = 'ios';
    mockPathname('/profile/me.test');
    expect(useProfileHref()('alice.test')).toBe('/profile/alice.test');
  });

  it('returns the collapsed user-profile href when on the index tab', () => {
    Platform.OS = 'ios';
    mockPathname('/');
    expect(useProfileHref()('alice.test')).toBe('/user-profile/alice.test');
  });

  it('returns the per-tab href for other tabs', () => {
    Platform.OS = 'ios';
    mockPathname('/bookmarks');
    expect(useProfileHref()('alice.test')).toBe('/bookmarks/user-profile/alice.test');
  });

  it('encodes the actor', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    expect(useProfileHref()('did:plc:a/b')).toBe(`/profile/${encodeURIComponent('did:plc:a/b')}`);
  });

  it('does not push (href-only helper)', () => {
    Platform.OS = 'ios';
    mockPathname('/');
    useProfileHref()('alice.test');
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('useNavigateToFeed', () => {
  it('uses the top-level profile feed route on web', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    useNavigateToFeed()({ actor: 'alice.test', rKey: 'feed1' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test/feed/feed1');
  });

  it('uses the profile tab feed route on native when on the profile tab', () => {
    Platform.OS = 'ios';
    mockPathname('/profile/me.test');
    useNavigateToFeed()({ actor: 'alice.test', rKey: 'feed1' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test/feed/feed1');
  });

  it('uses the collapsed user-profile feed route on the index tab', () => {
    Platform.OS = 'ios';
    mockPathname('/');
    useNavigateToFeed()({ actor: 'alice.test', rKey: 'feed1' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test/feed/feed1');
  });

  it('uses the per-tab variant for other tabs', () => {
    Platform.OS = 'ios';
    mockPathname('/search/x');
    useNavigateToFeed()({ actor: 'alice.test', rKey: 'feed1' });
    expect(router.push).toHaveBeenCalledWith('/search/user-profile/alice.test/feed/feed1');
  });

  it('does not push when already on the same feed path', () => {
    Platform.OS = 'web';
    mockPathname('/profile/alice.test/feed/feed1');
    useNavigateToFeed()({ actor: 'alice.test', rKey: 'feed1' });
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('useNavigateToGallery', () => {
  it('uses the top-level profile gallery route on web', () => {
    Platform.OS = 'web';
    mockPathname('/anything');
    useNavigateToGallery()({ actor: 'alice.test', rKey: 'gal1' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test/gallery/gal1');
  });

  it('uses the profile tab gallery route on native when on the profile tab', () => {
    Platform.OS = 'ios';
    mockPathname('/profile/me.test');
    useNavigateToGallery()({ actor: 'alice.test', rKey: 'gal1' });
    expect(router.push).toHaveBeenCalledWith('/profile/alice.test/gallery/gal1');
  });

  it('uses the collapsed user-profile gallery route on the index tab', () => {
    Platform.OS = 'ios';
    mockPathname('/');
    useNavigateToGallery()({ actor: 'alice.test', rKey: 'gal1' });
    expect(router.push).toHaveBeenCalledWith('/user-profile/alice.test/gallery/gal1');
  });

  it('uses the per-tab variant for other tabs', () => {
    Platform.OS = 'ios';
    mockPathname('/bookmarks');
    useNavigateToGallery()({ actor: 'alice.test', rKey: 'gal1' });
    expect(router.push).toHaveBeenCalledWith('/bookmarks/user-profile/alice.test/gallery/gal1');
  });

  it('does not push when already on the same gallery path', () => {
    Platform.OS = 'web';
    mockPathname('/profile/alice.test/gallery/gal1');
    useNavigateToGallery()({ actor: 'alice.test', rKey: 'gal1' });
    expect(router.push).not.toHaveBeenCalled();
  });
});
