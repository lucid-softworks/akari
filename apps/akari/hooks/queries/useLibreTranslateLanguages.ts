import { useQuery } from '@tanstack/react-query';

import {
  DEFAULT_LIBRETRANSLATE_LANGUAGES,
  getLibreTranslateClient,
  type LibreTranslateLanguage,
} from '@/utils/libretranslate';

export type LibreTranslateLanguagesResult = {
  languages: LibreTranslateLanguage[];
  isFallback: boolean;
};

const LANGUAGES_QUERY_KEY = ['libretranslate', 'languages'];

export const useLibreTranslateLanguages = (enabled: boolean) => {
  return useQuery<LibreTranslateLanguagesResult>({
    queryKey: LANGUAGES_QUERY_KEY,
    queryFn: async () => {
      try {
        const client = getLibreTranslateClient();
        const languages = await client.listLanguages();

        if (!languages || languages.length === 0) {
          return { languages: DEFAULT_LIBRETRANSLATE_LANGUAGES, isFallback: true };
        }

        return { languages, isFallback: false };
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to load LibreTranslate languages', error);
        }

        return { languages: DEFAULT_LIBRETRANSLATE_LANGUAGES, isFallback: true };
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled,
  });
};
