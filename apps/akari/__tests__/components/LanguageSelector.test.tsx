import { fireEvent, render } from '@testing-library/react-native';

import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { getAvailableLocales, getTranslationData } from '@/utils/i18n';

jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/i18n');

const mockUseTranslation = useTranslation as jest.Mock;
const mockGetAvailableLocales = getAvailableLocales as jest.Mock;
const mockGetTranslationData = getTranslationData as jest.Mock;

let changeLanguage: jest.Mock;

describe('LanguageSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    changeLanguage = jest.fn();
    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
      currentLocale: 'en',
      changeLanguage,
    });
    mockGetAvailableLocales.mockReturnValue(['en', 'es']);
    mockGetTranslationData.mockImplementation((locale: string) =>
      locale === 'en'
        ? { language: 'English', nativeName: 'English', flag: '🇺🇸' }
        : { language: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    );
  });

  it('renders current language', () => {
    const { getAllByText, getByText } = render(<LanguageSelector />);
    expect(getAllByText('English').length).toBe(2);
    expect(getByText('🇺🇸')).toBeTruthy();
  });

  it('allows selecting a different language', () => {
    const { getByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('▼'));
    fireEvent.press(getByText('Español'));
    expect(changeLanguage).toHaveBeenCalledWith('es');
  });
});
