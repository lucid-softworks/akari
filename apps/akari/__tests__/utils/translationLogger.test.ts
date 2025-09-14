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

  it('returns success message when no translations are missing', () => {
    (global as any).__DEV__ = true;
    const { translationLogger } = require('@/utils/translationLogger');
    translationLogger.clearMissingTranslations();

    const report = translationLogger.generateReport();
    expect(report).toBe('✅ No missing translations found!');
  });

  it('groups missing translations by key and locale', () => {
    (global as any).__DEV__ = true;
    const { translationLogger } = require('@/utils/translationLogger');

    translationLogger.clearMissingTranslations();
    translationLogger.logMissing('greeting', 'en');
    translationLogger.logMissing('greeting', 'fr');
    translationLogger.logMissing('farewell', 'en');

    const report = translationLogger.generateReport();
    expect(report).toContain('❌ Found 3 missing translation');
    expect(report).toContain('• greeting (missing in: en, fr)');
    expect(report).toContain('• farewell (missing in: en)');
  });

  it('re-enables logging when enabled after disable', () => {
    (global as any).__DEV__ = true;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { translationLogger } = require('@/utils/translationLogger');

    translationLogger.clearMissingTranslations();
    translationLogger.disable();
    translationLogger.enable();
    translationLogger.logMissing('welcome', 'en');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing translation'));
  });

  it('handles logUsage in enabled and disabled states', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { translationLogger } = require('@/utils/translationLogger');

    translationLogger.clearMissingTranslations();
    translationLogger.disable();
    translationLogger.logUsage('key', 'en');
    translationLogger.enable();
    translationLogger.logUsage('key', 'en');

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns a copy of missing translations', () => {
    (global as any).__DEV__ = true;
    const { translationLogger } = require('@/utils/translationLogger');

    translationLogger.clearMissingTranslations();
    translationLogger.logMissing('greeting', 'en');

    const logs = translationLogger.getMissingTranslations();
    (logs as any).push({ key: 'other', locale: 'fr', timestamp: Date.now() });

    expect(translationLogger.getMissingTranslations()).toHaveLength(1);
  });

  it('handles missing stack trace gracefully', () => {
    (global as any).__DEV__ = true;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { translationLogger } = require('@/utils/translationLogger');

    translationLogger.clearMissingTranslations();
    const OriginalError = Error;
    (global as any).Error = function () {
      return {} as Error;
    } as unknown as ErrorConstructor;
    translationLogger.logMissing('nostack', 'en');
    (global as any).Error = OriginalError;

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
