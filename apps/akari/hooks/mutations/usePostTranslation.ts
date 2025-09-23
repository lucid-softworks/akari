import { useMutation } from '@tanstack/react-query';

import { getLibreTranslateClient } from '@/utils/libretranslate';

type TranslateVariables = {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
};

type TranslateResult = {
  translatedText: string;
};

export const usePostTranslation = () => {
  return useMutation<TranslateResult, Error, TranslateVariables>({
    mutationKey: ['libretranslate', 'translate'],
    mutationFn: async ({ text, targetLanguage, sourceLanguage = 'auto' }) => {
      const trimmed = text.trim();

      if (!trimmed) {
        return { translatedText: '' };
      }

      const client = getLibreTranslateClient();
      const response = await client.translate(trimmed, sourceLanguage, targetLanguage);

      if (!response || response.status >= 400 || !response.translatedText) {
        throw new Error(response?.error || 'Translation failed');
      }

      return { translatedText: response.translatedText };
    },
  });
};
