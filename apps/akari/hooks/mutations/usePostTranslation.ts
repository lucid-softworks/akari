import { useMutation } from '@tanstack/react-query';

type TranslateVariables = {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
};

type TranslateResult = {
  translatedText: string;
  detectedLanguage?: string;
};

export const usePostTranslation = () => {
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- fire-and-forget, no cache derived from this mutation
  return useMutation<TranslateResult, Error, TranslateVariables>({
    mutationKey: ['translate'],
    mutationFn: async ({ text, targetLanguage, sourceLanguage = 'auto' }) => {
      const trimmed = text.trim();
      if (!trimmed) return { translatedText: '' };

      const response = await fetch('https://translate.akari.blue/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: trimmed,
          source: sourceLanguage,
          target: targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      return {
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage?.language,
      };
    },
  });
};
