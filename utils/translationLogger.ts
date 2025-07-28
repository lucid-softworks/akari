interface TranslationLog {
  key: string;
  locale: string;
  timestamp: number;
  stack?: string;
}

class TranslationLogger {
  private missingTranslations: TranslationLog[] = [];
  private isEnabled: boolean = __DEV__; // Only log in development

  logMissing(key: string, locale: string) {
    if (!this.isEnabled) return;

    const log: TranslationLog = {
      key,
      locale,
      timestamp: Date.now(),
      stack: new Error().stack,
    };

    this.missingTranslations.push(log);

    console.warn(`🌐 Missing translation: ${key} (locale: ${locale})`);

    // Log the call stack to help identify where the missing translation is used
    if (log.stack) {
      console.warn(
        `   Called from:`,
        log.stack.split("\n").slice(2, 5).join("\n")
      );
    }
  }

  logUsage(key: string, locale: string) {
    if (!this.isEnabled) return;

    // In development, you can uncomment this to log all translation usage
    // console.log(`🌐 Translation used: ${key} (locale: ${locale})`);
  }

  getMissingTranslations(): TranslationLog[] {
    return [...this.missingTranslations];
  }

  clearMissingTranslations() {
    this.missingTranslations = [];
  }

  generateReport(): string {
    if (this.missingTranslations.length === 0) {
      return "✅ No missing translations found!";
    }

    const groupedByKey = this.missingTranslations.reduce((acc, log) => {
      if (!acc[log.key]) {
        acc[log.key] = [];
      }
      acc[log.key].push(log);
      return acc;
    }, {} as Record<string, TranslationLog[]>);

    let report = `❌ Found ${this.missingTranslations.length} missing translation(s):\n\n`;

    Object.entries(groupedByKey).forEach(([key, logs]) => {
      const locales = [...new Set(logs.map((log) => log.locale))];
      report += `• ${key} (missing in: ${locales.join(", ")})\n`;
    });

    return report;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }
}

export const translationLogger = new TranslationLogger();

// Export a function to get the report in development
export const getTranslationReport = () => {
  if (__DEV__) {
    return translationLogger.generateReport();
  }
  return "Translation logging is only available in development mode.";
};
