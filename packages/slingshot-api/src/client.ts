export const DEFAULT_SLINGSHOT_BASE_URL = 'https://slingshot.microcosm.blue';

export type SlingshotClientOptions = {
  headers?: Record<string, string>;
  userAgent?: string;
};

type QueryParams = Record<string, string | undefined>;

export class SlingshotApiClient {
  protected readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = DEFAULT_SLINGSHOT_BASE_URL, options: SlingshotClientOptions = {}) {
    this.baseUrl = this.normalizeBaseUrl(baseUrl);
    this.defaultHeaders = this.createDefaultHeaders(options);
  }

  protected async get<T>(path: string, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      headers: this.mergeHeaders(headers),
    });

    if (!response.ok) {
      throw new Error(this.createErrorMessage(response.status, response.statusText));
    }

    return (await response.json()) as T;
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const normalizedPath = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    return url.toString();
  }

  private mergeHeaders(additional?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...this.defaultHeaders };

    if (additional) {
      for (const [key, value] of Object.entries(additional)) {
        headers[key] = value;
      }
    }

    return headers;
  }

  private createDefaultHeaders(options: SlingshotClientOptions): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (options.userAgent) {
      headers['User-Agent'] = options.userAgent;
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers[key] = value;
      }
    }

    return headers;
  }

  private createErrorMessage(status: number, statusText: string): string {
    const suffix = statusText ? ` ${statusText}` : '';
    return `Slingshot request failed with status ${status}${suffix}`;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim();

    if (!trimmed) {
      return DEFAULT_SLINGSHOT_BASE_URL;
    }

    return trimmed.replace(/\/+$/, '');
  }
}
