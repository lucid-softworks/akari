describe('translationLogger', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('records missing translations and generates report', () => {
    (global as any).__DEV__ = true;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const module = require('@/utils/translationLogger');
    const { translationLogger, getTranslationReport } = module;

    translationLogger.clearMissingTranslations();
    translationLogger.logMissing('greeting', 'en');

    const logs = translationLogger.getMissingTranslations();
    expect(logs).toHaveLength(1);
    expect(logs[0].key).toBe('greeting');

    const report = getTranslationReport();
    expect(report).toContain('❌ Found 1 missing translation');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing translation'));
  });

  it('does not log when disabled', () => {
    (global as any).__DEV__ = true;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const module = require('@/utils/translationLogger');
    const { translationLogger } = module;

    translationLogger.clearMissingTranslations();
    translationLogger.disable();
    translationLogger.logMissing('key', 'en');

    expect(warnSpy).not.toHaveBeenCalled();
    expect(translationLogger.getMissingTranslations()).toHaveLength(0);
  });

  it('returns message when not in development', () => {
    (global as any).__DEV__ = false;
    const { getTranslationReport } = require('@/utils/translationLogger');
    const report = getTranslationReport();
    expect(report).toBe('Translation logging is only available in development mode.');
  });
});
