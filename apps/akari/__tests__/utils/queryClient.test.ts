import type { Query } from '@tanstack/react-query';

const mockInstallAuthRefreshHandler = jest.fn();
jest.mock('@/utils/authRefreshHandler', () => ({
  installAuthRefreshHandler: (...args: unknown[]) => mockInstallAuthRefreshHandler(...args),
}));

type ShouldDehydrate = (query: Query) => boolean;
type FocusListener = (cb: (focused: boolean) => void) => () => void;

const queryWithStatus = (status: string): Query =>
  ({ state: { status } }) as unknown as Query;

const removeSubscription = jest.fn();

/**
 * Re-require react-native + react-query fresh, install spies on the *same*
 * module instances queryClient.ts will pull in, set the platform, then load
 * the module under test. resetModules() means the singletons are rebuilt per
 * test, so spies have to be attached after the reset.
 */
const setup = (os: string) => {
  jest.resetModules();
  mockInstallAuthRefreshHandler.mockClear();
  removeSubscription.mockClear();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { focusManager } = require('@tanstack/react-query');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppState, Platform } = require('react-native');

  Platform.OS = os;

  const setEventListenerSpy = jest
    .spyOn(focusManager, 'setEventListener')
    .mockImplementation(() => {});
  const appStateAddSpy = jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: removeSubscription } as unknown as ReturnType<
      typeof AppState.addEventListener
    >);

  const mod = require('@/utils/queryClient');
  return { mod, setEventListenerSpy, appStateAddSpy };
};

describe('queryClient module', () => {
  it('exposes the cache age and buster constants', () => {
    const { mod } = setup('ios');
    expect(mod.REACT_QUERY_CACHE_MAX_AGE).toBe(1000 * 60 * 60 * 24);
    expect(mod.REACT_QUERY_CACHE_BUSTER).toBe('akari@1');
  });

  it('builds a QueryClient with the expected query defaults', () => {
    const { mod } = setup('ios');
    const defaults = mod.queryClient.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(mod.REACT_QUERY_CACHE_MAX_AGE);
    expect(defaults.queries?.retry).toBe(2);
  });

  it('only dehydrates successful queries', () => {
    const { mod } = setup('ios');
    const shouldDehydrate = mod.queryClient.getDefaultOptions().dehydrate
      ?.shouldDehydrateQuery as ShouldDehydrate;
    expect(shouldDehydrate(queryWithStatus('success'))).toBe(true);
    expect(shouldDehydrate(queryWithStatus('pending'))).toBe(false);
    expect(shouldDehydrate(queryWithStatus('error'))).toBe(false);
  });

  it('installs the auth refresh handler with the created client', () => {
    const { mod } = setup('ios');
    expect(mockInstallAuthRefreshHandler).toHaveBeenCalledTimes(1);
    expect(mockInstallAuthRefreshHandler).toHaveBeenCalledWith(mod.queryClient);
  });

  it('wires AppState into the focus manager on native', () => {
    const { setEventListenerSpy, appStateAddSpy } = setup('ios');
    expect(setEventListenerSpy).toHaveBeenCalledTimes(1);

    const registerListener = setEventListenerSpy.mock.calls[0][0] as FocusListener;
    const handleFocus = jest.fn();

    const cleanup = registerListener(handleFocus);
    expect(appStateAddSpy).toHaveBeenCalledWith('change', expect.any(Function));

    // Driving the AppState callback should forward active-ness to handleFocus.
    const onChange = appStateAddSpy.mock.calls[0][1] as (status: string) => void;
    onChange('active');
    onChange('background');
    expect(handleFocus).toHaveBeenNthCalledWith(1, true);
    expect(handleFocus).toHaveBeenNthCalledWith(2, false);

    // The returned cleanup removes the AppState subscription.
    cleanup();
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it('skips the AppState wiring on web', () => {
    const { setEventListenerSpy, appStateAddSpy } = setup('web');
    expect(setEventListenerSpy).not.toHaveBeenCalled();
    expect(appStateAddSpy).not.toHaveBeenCalled();
  });
});
