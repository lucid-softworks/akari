import {
  DEFAULT_LIBRETRANSLATE_ENDPOINT,
  DEFAULT_LIBRETRANSLATE_LANGUAGES,
  LibreTranslateClient,
  createLibreTranslateClient,
  sanitizeLibreTranslateEndpoint,
} from '../src';

describe('sanitizeLibreTranslateEndpoint', () => {
  it('falls back to the public default for empty input', () => {
    expect(sanitizeLibreTranslateEndpoint(undefined)).toBe(DEFAULT_LIBRETRANSLATE_ENDPOINT);
    expect(sanitizeLibreTranslateEndpoint(null)).toBe(DEFAULT_LIBRETRANSLATE_ENDPOINT);
    expect(sanitizeLibreTranslateEndpoint('')).toBe(DEFAULT_LIBRETRANSLATE_ENDPOINT);
  });

  it('strips a single trailing slash', () => {
    expect(sanitizeLibreTranslateEndpoint('https://lt.example.com/')).toBe('https://lt.example.com');
  });

  it('returns endpoints without a trailing slash unchanged', () => {
    expect(sanitizeLibreTranslateEndpoint('https://lt.example.com')).toBe('https://lt.example.com');
  });
});

describe('LibreTranslateClient', () => {
  const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();

  beforeAll(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  const jsonResponse = (body: unknown, init: ResponseInit = { status: 200 }) =>
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

  const lastCall = () => {
    const calls = fetchMock.mock.calls;
    return calls[calls.length - 1] ?? [];
  };

  describe('listLanguages', () => {
    it('returns the parsed languages array', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse([
          { code: 'en', name: 'English', targets: ['de', 'fr'] },
          { code: 'de', name: 'German' },
        ]),
      );

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });
      const languages = await client.listLanguages();

      expect(languages).toEqual([
        { code: 'en', name: 'English', targets: ['de', 'fr'] },
        { code: 'de', name: 'German', targets: [] },
      ]);
      const [url, init] = lastCall();
      expect(String(url)).toBe('https://lt.example.com/languages');
      expect(init?.method).toBe('GET');
    });

    it('throws with the API-provided error message when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'API key required' }, { status: 403 }));

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });

      await expect(client.listLanguages()).rejects.toThrow('API key required');
    });

    it('throws when the payload is not an array', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: true }));

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });

      await expect(client.listLanguages()).rejects.toThrow('Invalid languages response');
    });
  });

  describe('detect', () => {
    it('returns the first language entry on success', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ language: 'en', confidence: 0.97 }]));

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com', apiKey: 'secret' });
      const result = await client.detect('hello world');

      expect(result).toEqual({ status: 200, language: 'en', confidence: 0.97 });
      const [url, init] = lastCall();
      expect(String(url)).toBe('https://lt.example.com/detect');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        q: 'hello world',
        format: 'text',
        api_key: 'secret',
      });
    });

    it('reports the API error when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, { status: 429 }));

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });
      const result = await client.detect('hi');

      expect(result).toEqual({ status: 429, language: '', confidence: 0, error: 'rate limited' });
    });

    it('captures network errors as a 500 response', async () => {
      fetchMock.mockRejectedValueOnce(new Error('boom'));

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });
      const result = await client.detect('hi');

      expect(result).toEqual({ status: 500, language: '', confidence: 0, error: 'boom' });
    });
  });

  describe('translate', () => {
    it('returns the translated text and alternatives', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ translatedText: 'Hallo', alternatives: ['Hi', 42, 'Servus'] }),
      );

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });
      const result = await client.translate('Hello', 'en', 'de', 2);

      expect(result.status).toBe(200);
      expect(result.translatedText).toBe('Hallo');
      expect(result.alternatives).toEqual(['Hi', 'Servus']);
      const [, init] = lastCall();
      expect(JSON.parse(String(init?.body))).toEqual({
        q: 'Hello',
        source: 'en',
        target: 'de',
        format: 'text',
        alternatives: 2,
      });
    });

    it('returns the API error message when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'unsupported language' }, { status: 400 }));

      const client = new LibreTranslateClient({ endpoint: 'https://lt.example.com' });
      const result = await client.translate('Hello', 'en', 'xx');

      expect(result).toEqual({ status: 400, translatedText: '', error: 'unsupported language' });
    });
  });
});

describe('createLibreTranslateClient', () => {
  it('returns a configured LibreTranslateClient instance', () => {
    const client = createLibreTranslateClient({ endpoint: 'https://lt.example.com/', apiKey: 'k' });
    expect(client).toBeInstanceOf(LibreTranslateClient);
  });

  it('falls back to the default endpoint when no config is provided', () => {
    const client = createLibreTranslateClient();
    expect(client).toBeInstanceOf(LibreTranslateClient);
  });
});

describe('DEFAULT_LIBRETRANSLATE_LANGUAGES', () => {
  it('exposes a non-empty list of language descriptors', () => {
    expect(DEFAULT_LIBRETRANSLATE_LANGUAGES.length).toBeGreaterThan(0);
    for (const language of DEFAULT_LIBRETRANSLATE_LANGUAGES) {
      expect(typeof language.code).toBe('string');
      expect(typeof language.name).toBe('string');
      expect(Array.isArray(language.targets)).toBe(true);
    }
  });
});
