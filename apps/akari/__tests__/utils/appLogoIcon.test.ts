type Bridge = {
  setAlternateIconName: jest.Mock;
  getCurrentAlternateIconName: jest.Mock;
  supportsAlternateIcons: jest.Mock;
};

function loadModule(os: string, bridge: Bridge | null) {
  // resetModules before mocking so the module-under-test gets a fresh require
  // after the doMock takes effect. Without this the per-test mock can race
  // against a stale cached `react-native` from a prior test in the same file.
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
    NativeModules: bridge ? { AppLogoIconBridge: bridge } : {},
  }));
  return require('@/utils/appLogoIcon');
}

function makeBridge(): Bridge {
  return {
    setAlternateIconName: jest.fn().mockResolvedValue(true),
    getCurrentAlternateIconName: jest.fn().mockResolvedValue(null),
    supportsAlternateIcons: jest.fn().mockResolvedValue(true),
  };
}

describe('appLogoIcon', () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetModules();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('applyHomescreenIcon', () => {
    it('no-ops on web without touching native modules', async () => {
      const { applyHomescreenIcon } = loadModule('web', null);
      await expect(applyHomescreenIcon('default')).resolves.toBeUndefined();
    });

    it('soft no-ops on native when the bridge is unavailable and warns once', async () => {
      const { applyHomescreenIcon } = loadModule('ios', null);
      await expect(applyHomescreenIcon('default')).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('NativeModules.AppLogoIconBridge is undefined'),
      );
    });

    it('passes null to the native bridge for the default variant', async () => {
      const bridge = makeBridge();
      const { applyHomescreenIcon } = loadModule('ios', bridge);
      await applyHomescreenIcon('default');
      expect(bridge.setAlternateIconName).toHaveBeenCalledWith(null);
    });

    it('passes the variant name to the native bridge for non-default variants', async () => {
      const bridge = makeBridge();
      const { applyHomescreenIcon } = loadModule('android', bridge);
      await applyHomescreenIcon('pride' as never);
      expect(bridge.setAlternateIconName).toHaveBeenCalledWith('pride');
    });

    it('swallows native bridge errors and warns', async () => {
      const bridge = makeBridge();
      bridge.setAlternateIconName.mockRejectedValue(new Error('backgrounded'));
      const { applyHomescreenIcon } = loadModule('ios', bridge);
      await expect(applyHomescreenIcon('dark' as never)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        '[applyHomescreenIcon] failed',
        expect.any(Error),
      );
    });
  });

  describe('supportsHomescreenIconSwap', () => {
    it('returns false on web', async () => {
      const { supportsHomescreenIconSwap } = loadModule('web', makeBridge());
      await expect(supportsHomescreenIconSwap()).resolves.toBe(false);
    });

    it('returns false on native when the bridge is unavailable', async () => {
      const { supportsHomescreenIconSwap } = loadModule('android', null);
      await expect(supportsHomescreenIconSwap()).resolves.toBe(false);
    });

    it('delegates to the native bridge when available', async () => {
      const bridge = makeBridge();
      bridge.supportsAlternateIcons.mockResolvedValue(true);
      const { supportsHomescreenIconSwap } = loadModule('ios', bridge);
      await expect(supportsHomescreenIconSwap()).resolves.toBe(true);
      expect(bridge.supportsAlternateIcons).toHaveBeenCalled();
    });

    it('returns the false value reported by the native bridge', async () => {
      const bridge = makeBridge();
      bridge.supportsAlternateIcons.mockResolvedValue(false);
      const { supportsHomescreenIconSwap } = loadModule('android', bridge);
      await expect(supportsHomescreenIconSwap()).resolves.toBe(false);
    });

    it('returns false when the native bridge throws', async () => {
      const bridge = makeBridge();
      bridge.supportsAlternateIcons.mockRejectedValue(new Error('nope'));
      const { supportsHomescreenIconSwap } = loadModule('ios', bridge);
      await expect(supportsHomescreenIconSwap()).resolves.toBe(false);
    });
  });
});
