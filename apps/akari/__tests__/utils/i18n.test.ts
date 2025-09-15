import type { I18n } from 'i18n-js';

type LoadOptions = {
  languageCode?: string | null;
};

type LoadedModule = {
  i18nModule: typeof import('@/utils/i18n');
  logMissing: jest.Mock;
  logUsage: jest.Mock;
};

const loadI18n = ({ languageCode = 'en' }: LoadOptions = {}): LoadedModule => {
  jest.resetModules();

  const logMissing = jest.fn();
  const logUsage = jest.fn();

  jest.doMock('expo-localization', () => ({
    __esModule: true,
    getLocales: () =>
      [
        {
          languageCode,
        },
      ],
  }));

  jest.doMock('@/utils/translationLogger', () => ({
    __esModule: true,
    translationLogger: {
      logMissing,
      logUsage,
    },
  }));

  const i18nModule = require('@/utils/i18n') as typeof import('@/utils/i18n');

  return { i18nModule, logMissing, logUsage };
};

describe('i18n utility', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses the device language when available and logs translation usage', () => {
    const { i18nModule, logUsage } = loadI18n({ languageCode: 'fr' });
    const i18n = i18nModule.default as I18n;

    const translation = i18n.t('common.loading');

    expect(translation).toBe('Chargement...');
    expect(i18nModule.getCurrentLocale()).toBe('fr');
    expect(logUsage).toHaveBeenCalledWith('common.loading', 'fr');
  });

  it('falls back to English when the device language is unavailable', () => {
    const { i18nModule, logUsage } = loadI18n({ languageCode: null });
    const i18n = i18nModule.default as I18n;

    const translation = i18n.t('common.loading');

    expect(translation).toBe('Loading...');
    expect(i18nModule.getCurrentLocale()).toBe('en');
    expect(logUsage).toHaveBeenCalledWith('common.loading', 'en');
  });

  it('logs missing translations when the translation result matches the key', () => {
    const { i18nModule, logMissing, logUsage } = loadI18n({ languageCode: 'en' });
    const i18n = i18nModule.default as I18n;

    (i18n.translations as Record<string, Record<string, string>>).en.echo = 'echo';

    const result = i18n.t('echo');

    expect(result).toBe('echo');
    expect(logMissing).toHaveBeenCalledWith('echo', 'en');
    expect(logUsage).not.toHaveBeenCalled();
  });

  it('skips logging when the translation scope is not a string', () => {
    const { i18nModule, logMissing, logUsage } = loadI18n({ languageCode: 'en' });
    const i18n = i18nModule.default as I18n;

    const result = i18n.t(['common.loading']);

    expect(result).toBe('Loading...');
    expect(logMissing).not.toHaveBeenCalled();
    expect(logUsage).not.toHaveBeenCalled();
  });

  it('allows manually updating the locale', () => {
    const { i18nModule } = loadI18n({ languageCode: 'en' });

    i18nModule.setLocale('ja');

    expect(i18nModule.getCurrentLocale()).toBe('ja');
    expect((i18nModule.default as I18n).locale).toBe('ja');
  });

  it('exposes available locales and enriched translation data', () => {
    const { i18nModule } = loadI18n({ languageCode: 'en' });

    const locales = i18nModule.getAvailableLocales();
    expect(locales).toEqual(expect.arrayContaining(['en', 'ja', 'pseudo']));

    const pseudoData = i18nModule.getTranslationData('pseudo');
    expect(pseudoData).toBeDefined();
    expect(pseudoData?.language).toBe('Pseudo');
    expect(pseudoData?.nativeName).toBe('Pseudo');
    expect(pseudoData?.flag).toBe('🔤');
    expect(pseudoData?.translations.common.loading).toBe('[Lòàdìñg...]');

    const englishData = i18nModule.getTranslationData('en');
    expect(englishData?.language).toBe('English');
    expect(englishData?.translations.common.loading).toBe('Loading...');
  });
});
