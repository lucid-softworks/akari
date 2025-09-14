describe('devUtils', () => {
  afterEach(() => {
    jest.resetModules();
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
});
