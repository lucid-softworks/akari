export const DEFAULT_MICROCOSM_BASE_URL = 'https://constellation.microcosm.blue';

export type MicrocosmClientOptions = {
  headers?: Record<string, string>;
  userAgent?: string;
};

type QueryValue = string | number | readonly (string | number)[] | undefined;

type QueryParams = Record<string, QueryValue>;

const normalizePath = (path: string): string => {
  if (path === '') {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
};

export class MicrocosmApiClient {
  protected readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = DEFAULT_MICROCOSM_BASE_URL, options: MicrocosmClientOptions = {}) {
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
    const url = new URL(`${this.baseUrl}${normalizePath(path)}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
          continue;
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            if (item === undefined) {
              continue;
            }

            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.set(key, String(value));
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

  private createDefaultHeaders(options: MicrocosmClientOptions): Record<string, string> {
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
    return `Microcosm request failed with status ${status}${suffix}`;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim();

    if (!trimmed) {
      return DEFAULT_MICROCOSM_BASE_URL;
    }

    return trimmed.replace(/\/+$/, '');
  }
}
