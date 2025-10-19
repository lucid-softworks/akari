import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from 'react-native';

import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { getAvailableLocales, getTranslationData } from '@/utils/i18n';

jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/i18n');

const mockUseTranslation = useTranslation as jest.Mock;
const mockGetAvailableLocales = getAvailableLocales as jest.Mock;
const mockGetTranslationData = getTranslationData as jest.Mock;

const englishMetadata = {
  language: 'English',
  nativeName: 'English',
  flag: '🇺🇸',
};

const spanishMetadata = {
  language: 'Spanish',
  nativeName: 'Español',
  flag: '🇪🇸',
};

let changeLanguage: jest.Mock;

const renderLanguageSelector = () => render(<LanguageSelector />);

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
      locale === 'en' ? englishMetadata : spanishMetadata,
    );
  });

  it('renders the current language and highlights the selection', () => {
    const view = renderLanguageSelector();

    expect(view.getAllByText('English')).toHaveLength(2);
    expect(view.getByText('🇺🇸')).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: 'settings.language' }));
    expect(view.getByRole('menu', { name: 'settings.language' })).toBeTruthy();
    // The checkmark is now an IconSymbol component, which is mocked to return null
  });

  it('allows selecting a different language from the modal', () => {
    const view = renderLanguageSelector();

    fireEvent.press(view.getByRole('button', { name: 'settings.language' }));
    fireEvent.press(view.getByText('Español'));

    expect(changeLanguage).toHaveBeenCalledWith('es');
  });

  it('falls back to the first language when the current locale is unavailable', () => {
    mockUseTranslation.mockReturnValueOnce({
      t: (key: string) => key,
      currentLocale: 'fr',
      changeLanguage,
    });
    mockGetAvailableLocales.mockReturnValueOnce(['es', 'en']);

    const view = renderLanguageSelector();

    expect(view.getAllByText('English')).toHaveLength(2);
    expect(view.getByText('🇺🇸')).toBeTruthy();
  });

  it('filters out languages without complete metadata', () => {
    mockGetTranslationData.mockImplementation((locale: string) =>
      locale === 'en'
        ? englishMetadata
        : { language: 'Spanish', nativeName: 'Español' },
    );

    const view = renderLanguageSelector();

    expect(view.getAllByText('English')).toHaveLength(2);
    expect(view.queryByText('Español')).toBeNull();
  });

  it('logs a warning when translation metadata retrieval fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetTranslationData.mockImplementation((locale: string) => {
      if (locale === 'es') {
        throw new Error('boom');
      }

      return englishMetadata;
    });

    const { queryByText } = renderLanguageSelector();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to get metadata for locale: es',
      expect.any(Error),
    );
    expect(queryByText('Español')).toBeNull();

    warnSpy.mockRestore();
  });

  it('closes the modal when dismissed from overlay press or request close', () => {
    const view = renderLanguageSelector();

    fireEvent.press(view.getByRole('button', { name: 'settings.language' }));
    fireEvent.press(view.getByRole('button', { name: 'common.cancel' }));

    expect(changeLanguage).not.toHaveBeenCalled();

    const modal = view.UNSAFE_getByType(Modal);
    fireEvent(modal, 'requestClose');

    fireEvent.press(view.getByRole('button', { name: 'settings.language' }));
    fireEvent(modal, 'requestClose');
  });
});
