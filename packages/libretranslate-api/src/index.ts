export const DEFAULT_LIBRETRANSLATE_ENDPOINT = 'https://libretranslate.com';

export type LibreTranslateLanguage = {
  code: string;
  name: string;
  targets: string[];
};

export type LibreTranslateDetectResponse = {
  status: number;
  language: string;
  confidence: number;
  error?: string;
};

export type LibreTranslateTranslateResponse = {
  status: number;
  translatedText: string;
  error?: string;
  alternatives?: string[];
};

export type LibreTranslateClientConfig = {
  endpoint?: string | null;
  apiKey?: string;
};

type InternalClientConfig = {
  endpoint: string;
  apiKey?: string;
};

type DetectPayload = {
  q: string;
  format: 'text';
  api_key?: string;
};

type TranslatePayload = {
  q: string;
  source: string;
  target: string;
  format: 'text';
  api_key?: string;
  alternatives?: number;
};

type TranslateJson = {
  translatedText?: unknown;
  error?: unknown;
  alternatives?: unknown;
};

type DetectJsonEntry = {
  language?: unknown;
  confidence?: unknown;
};

type ErrorJson = {
  error?: unknown;
};

/**
 * Normalises a configured LibreTranslate endpoint by removing trailing slashes and
 * falling back to the default public instance when no value is supplied.
 * @param endpoint - User supplied endpoint string or null/undefined.
 * @returns Sanitised endpoint string that can be safely concatenated with request paths.
 */
export const sanitizeLibreTranslateEndpoint = (endpoint: string | undefined | null) => {
  if (!endpoint) {
    return DEFAULT_LIBRETRANSLATE_ENDPOINT;
  }

  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
};

export class LibreTranslateClient {
  private readonly endpoint: string;

  private readonly apiKey?: string;

  /**
   * Creates a new client targeting the provided LibreTranslate endpoint.
   * @param param0 - Endpoint configuration containing the base URL and optional API key.
   */
  constructor({ endpoint, apiKey }: InternalClientConfig) {
    this.endpoint = sanitizeLibreTranslateEndpoint(endpoint);
    this.apiKey = apiKey;
  }

  /**
   * Builds an absolute URL for the supplied path relative to the configured endpoint.
   * @param path - API path that may include a leading slash.
   * @returns Fully qualified URL pointing at the LibreTranslate instance.
   */
  private buildUrl(path: string) {
    if (!path.startsWith('/')) {
      return `${this.endpoint}/${path}`;
    }

    return `${this.endpoint}${path}`;
  }

  /**
   * Creates a baseline set of request headers with optional content type overrides.
   * @param contentType - Content type to apply when sending JSON payloads.
   * @returns Headers object that always includes an `Accept` header for JSON.
   */
  private createHeaders(contentType?: string): HeadersInit {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    return headers;
  }

  /**
   * Injects the configured API key into LibreTranslate payloads when present.
   * @param payload - Request payload that should include the API key.
   * @returns Payload augmented with the `api_key` property when a key is available.
   */
  private withApiKey<T extends DetectPayload | TranslatePayload>(payload: T): T {
    if (this.apiKey) {
      return { ...payload, api_key: this.apiKey };
    }

    return payload;
  }

  /**
   * Extracts a meaningful error message from LibreTranslate responses when available.
   * @param data - Parsed JSON body returned by LibreTranslate.
   * @param fallback - Message to use when the payload does not contain an error string.
   * @returns Error string suitable for surfacing to callers.
   */
  private getErrorMessage(data: unknown, fallback: string) {
    if (data && typeof data === 'object' && 'error' in data) {
      const value = (data as ErrorJson).error;

      if (typeof value === 'string') {
        return value;
      }
    }

    return fallback;
  }

  /**
   * Safely parses JSON bodies while swallowing parsing failures.
   * @param response - Fetch response object containing a JSON payload.
   * @returns Parsed JSON body or undefined when parsing fails.
   */
  private async safeParseJson<T>(response: Response) {
    try {
      return (await response.json()) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * Retrieves the languages supported by the configured LibreTranslate instance.
   * @returns Array of language descriptors filtered to valid entries.
   */
  async listLanguages(): Promise<LibreTranslateLanguage[]> {
    try {
      const response = await fetch(this.buildUrl('/languages'), {
        method: 'GET',
        headers: this.createHeaders(),
      });

      const data = await this.safeParseJson<unknown>(response);

      if (!response.ok) {
        const message = this.getErrorMessage(data, response.statusText || 'Failed to load languages');
        throw new Error(message || 'Failed to load languages');
      }

      if (!Array.isArray(data)) {
        throw new Error('Invalid languages response');
      }

      return data
        .filter((entry): entry is LibreTranslateLanguage => {
          if (!entry || typeof entry !== 'object') {
            return false;
          }

          const language = entry as Partial<LibreTranslateLanguage>;
          return typeof language.code === 'string' && typeof language.name === 'string';
        })
        .map((entry) => ({
          code: entry.code,
          name: entry.name,
          targets: Array.isArray(entry.targets)
            ? entry.targets.filter((target): target is string => typeof target === 'string')
            : [],
        }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to load languages');
    }
  }

  /**
   * Detects the language of the provided text.
   * @param text - Sample text whose language should be inferred.
   * @returns Detection response including confidence and optional error details.
   */
  async detect(text: string): Promise<LibreTranslateDetectResponse> {
    try {
      const payload: DetectPayload = this.withApiKey({ q: text, format: 'text' });
      const response = await fetch(this.buildUrl('/detect'), {
        method: 'POST',
        headers: this.createHeaders('application/json'),
        body: JSON.stringify(payload),
      });

      const data = await this.safeParseJson<unknown>(response);

      if (!response.ok) {
        const message = this.getErrorMessage(data, response.statusText || 'Detection failed');
        return {
          status: response.status,
          language: '',
          confidence: 0,
          error: message,
        };
      }

      if (Array.isArray(data) && data.length > 0) {
        const firstEntry = data[0] as DetectJsonEntry;

        return {
          status: response.status,
          language: typeof firstEntry.language === 'string' ? firstEntry.language : '',
          confidence: typeof firstEntry.confidence === 'number' ? firstEntry.confidence : 0,
        };
      }

      return {
        status: response.status,
        language: '',
        confidence: 0,
      };
    } catch (error) {
      return {
        status: 500,
        language: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Detection failed',
      };
    }
  }

  /**
   * Translates text between languages using the LibreTranslate API.
   * @param text - Source text to translate.
   * @param sourceLang - Language code representing the source language.
   * @param targetLang - Language code representing the desired target language.
   * @param alternatives - Optional number of alternative translations to request.
   * @returns Translation response including translated text, alternatives and error information.
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    alternatives?: number,
  ): Promise<LibreTranslateTranslateResponse> {
    try {
      const payload: TranslatePayload = this.withApiKey({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
        alternatives,
      });

      const response = await fetch(this.buildUrl('/translate'), {
        method: 'POST',
        headers: this.createHeaders('application/json'),
        body: JSON.stringify(payload),
      });

      const data = await this.safeParseJson<TranslateJson | ErrorJson>(response);

      if (!response.ok) {
        const message = this.getErrorMessage(data, response.statusText || 'Translation failed');
        return {
          status: response.status,
          translatedText: '',
          error: message,
        };
      }

      const translatedText =
        data && typeof data === 'object' && 'translatedText' in data && typeof data.translatedText === 'string'
          ? data.translatedText
          : '';

      let alternativesList: string[] | undefined;

      if (data && typeof data === 'object' && 'alternatives' in data) {
        const alternativesValue = (data as TranslateJson).alternatives;

        if (Array.isArray(alternativesValue)) {
          alternativesList = alternativesValue.filter((value): value is string => typeof value === 'string');
        }
      }

      let errorMessage: string | undefined;

      if (data && typeof data === 'object' && 'error' in data) {
        const errorValue = (data as ErrorJson).error;

        if (typeof errorValue === 'string') {
          errorMessage = errorValue;
        }
      }

      return {
        status: response.status,
        translatedText,
        alternatives: alternativesList,
        error: errorMessage,
      };
    } catch (error) {
      return {
        status: 500,
        translatedText: '',
        error: error instanceof Error ? error.message : 'Translation failed',
      };
    }
  }
}

/**
 * Convenience factory that builds a client using optional configuration overrides.
 * @param config - Endpoint and API key configuration used to initialise the client.
 * @returns Fully configured {@link LibreTranslateClient} instance.
 */
export const createLibreTranslateClient = (config?: LibreTranslateClientConfig) => {
  const endpoint = sanitizeLibreTranslateEndpoint(config?.endpoint ?? undefined);

  return new LibreTranslateClient({
    endpoint,
    apiKey: config?.apiKey,
  });
};

export const DEFAULT_LIBRETRANSLATE_LANGUAGES: LibreTranslateLanguage[] = [
  { code: 'ar', name: 'Arabic', targets: [] },
  { code: 'az', name: 'Azerbaijani', targets: [] },
  { code: 'bg', name: 'Bulgarian', targets: [] },
  { code: 'cs', name: 'Czech', targets: [] },
  { code: 'da', name: 'Danish', targets: [] },
  { code: 'de', name: 'German', targets: [] },
  { code: 'el', name: 'Greek', targets: [] },
  { code: 'en', name: 'English', targets: [] },
  { code: 'es', name: 'Spanish', targets: [] },
  { code: 'fa', name: 'Persian', targets: [] },
  { code: 'fi', name: 'Finnish', targets: [] },
  { code: 'fr', name: 'French', targets: [] },
  { code: 'he', name: 'Hebrew', targets: [] },
  { code: 'hi', name: 'Hindi', targets: [] },
  { code: 'hu', name: 'Hungarian', targets: [] },
  { code: 'id', name: 'Indonesian', targets: [] },
  { code: 'it', name: 'Italian', targets: [] },
  { code: 'ja', name: 'Japanese', targets: [] },
  { code: 'ko', name: 'Korean', targets: [] },
  { code: 'nl', name: 'Dutch', targets: [] },
  { code: 'pl', name: 'Polish', targets: [] },
  { code: 'pt', name: 'Portuguese', targets: [] },
  { code: 'ro', name: 'Romanian', targets: [] },
  { code: 'ru', name: 'Russian', targets: [] },
  { code: 'sk', name: 'Slovak', targets: [] },
  { code: 'sl', name: 'Slovenian', targets: [] },
  { code: 'sv', name: 'Swedish', targets: [] },
  { code: 'th', name: 'Thai', targets: [] },
  { code: 'tr', name: 'Turkish', targets: [] },
  { code: 'uk', name: 'Ukrainian', targets: [] },
  { code: 'vi', name: 'Vietnamese', targets: [] },
  { code: 'zh', name: 'Chinese', targets: [] },
];
