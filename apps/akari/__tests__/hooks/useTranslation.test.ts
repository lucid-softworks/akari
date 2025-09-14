import { renderHook } from '@testing-library/react-native';

import useTranslation from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import i18n from '@/utils/i18n';

jest.mock('@/contexts/LanguageContext');
jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: jest.fn() },
}));

const mockUseLanguage = useLanguage as jest.Mock;
const mockI18n = i18n as { t: jest.Mock };

describe('useTranslation', () => {
  let changeLanguage: jest.Mock;
  let currentLocale: string;
  let availableLocales: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    changeLanguage = jest.fn();
    currentLocale = 'en';
    availableLocales = ['en', 'es'];
    mockUseLanguage.mockReturnValue({
      currentLocale,
      changeLanguage,
      availableLocales,
    });
  });

  it('delegates translation to i18n.t with options', () => {
    mockI18n.t.mockReturnValue('translated');

    const { result } = renderHook(() => useTranslation());
    const output = result.current.t('common.ok' as any, { count: 1 });

    expect(mockI18n.t).toHaveBeenCalledWith('common.ok', { count: 1 });
    expect(output).toBe('translated');
  });

  it('exposes language helpers from context', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.changeLanguage).toBe(changeLanguage);
    expect(result.current.currentLocale).toBe(currentLocale);
    expect(result.current.availableLocales).toEqual(availableLocales);
    expect(result.current.locale).toBe(currentLocale);
  });
});

