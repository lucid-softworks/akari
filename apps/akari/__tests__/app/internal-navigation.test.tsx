import { navigateInternal } from '@/components/InternalLink';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    getState: jest.fn(),
  },
}));

describe('navigateInternal', () => {
  const mockPush = router.push as jest.Mock;
  const mockReplace = router.replace as jest.Mock;
  const mockNavigate = router.navigate as jest.Mock;
  const mockGetState = router.getState as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefixes routes with tabs group when already inside tabs', () => {
    mockGetState.mockReturnValue({
      index: 1,
      routes: [
        { key: 'auth', name: '(auth)' },
        { key: 'tabs', name: '(tabs)', state: { index: 0, routes: [{ key: 'home', name: 'index' }] } },
      ],
    });

    navigateInternal({ href: '/post/abc' });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/post/abc');
  });

  it('navigates to tabs when not already focused', () => {
    mockGetState.mockReturnValue({
      index: 0,
      routes: [{ key: 'auth', name: '(auth)' }],
    });

    navigateInternal({ href: '/profile/alice' });

    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)');
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/profile/alice');
  });

  it('supports replace without double prefix', () => {
    mockGetState.mockReturnValue({
      index: 1,
      routes: [
        { key: 'tabs', name: '(tabs)', state: { index: 0, routes: [{ key: 'home', name: 'index' }] } },
      ],
    });

    navigateInternal({ href: '/(tabs)/messages/pending', action: 'replace' });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/messages/pending');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
