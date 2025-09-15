describe('devUtils', () => {
  let originalDev: boolean | undefined;

  beforeEach(() => {
    originalDev = (global as any).__DEV__;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    if (typeof originalDev === 'undefined') {
      delete (global as any).__DEV__;
    } else {
      (global as any).__DEV__ = originalDev;
    }
  });

  it('logs translation stats in development', () => {
    (global as any).__DEV__ = true;
    jest.doMock('@/utils/translationLogger', () => ({
      getTranslationReport: jest.fn(() => 'report'),
    }));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { logTranslationStats } = require('@/utils/devUtils');
    const result = logTranslationStats();
    expect(result).toBe('report');
    expect(logSpy).toHaveBeenCalledWith('📊 Translation Report:');
    expect(logSpy).toHaveBeenCalledWith('report');
  });

  it('returns null outside development', () => {
    (global as any).__DEV__ = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { logTranslationStats } = require('@/utils/devUtils');
    const result = logTranslationStats();
    expect(result).toBeNull();
    expect(logSpy).toHaveBeenCalledWith('Translation checking is only available in development mode.');
  });

  it('logs available translations in development', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { logAvailableTranslations } = require('@/utils/devUtils');
    logAvailableTranslations();
    expect(logSpy).toHaveBeenCalledWith('🔍 To see all available translation keys, check utils/i18n.ts');
  });

  it('does not log available translations outside development', () => {
    (global as any).__DEV__ = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { logAvailableTranslations } = require('@/utils/devUtils');
    logAvailableTranslations();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
