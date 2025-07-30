import { getTranslationReport } from './translationLogger';

/**
 * Logs translation usage statistics in development mode
 */
export const logTranslationStats = () => {
  if (__DEV__) {
    const report = getTranslationReport();
    console.log('📊 Translation Report:');
    console.log(report);
    return report;
  } else {
    console.log('Translation checking is only available in development mode.');
    return null;
  }
};

/**
 * Logs all available translation keys
 */
export const logAvailableTranslations = () => {
  if (__DEV__) {
    // This would require importing the translations object
    // For now, just log a message
    console.log('🔍 To see all available translation keys, check utils/i18n.ts');
  }
};
