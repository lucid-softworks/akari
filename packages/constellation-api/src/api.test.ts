import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ConstellationApi } from './api';
import { createConstellationApi } from './index';

const baseUrl = 'https://constellation.test';
const server = setupServer();

type TestLinksQuery = {
  target: string;
  collection: string;
  path: string;
  cursor?: string;
};

type HeaderCollector = {
  accept?: string;
  custom?: string;
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('ConstellationApi', () => {
  const createApi = () => new ConstellationApi(baseUrl, { userAgent: 'akari-tests' });

  const buildQuery = (overrides: Partial<TestLinksQuery> = {}): TestLinksQuery => ({
    target: 'did:plc:example',
    collection: 'app.bsky.graph.follow',
    path: '.subject',
    ...overrides,
  });

  it('retrieves server information', async () => {
    const payload = {
      help: 'open this URL in a web browser',
      days_indexed: 250,
      stats: {
        dids: 100,
        targetables: 200,
        linking_records: 300,
      },
    };

    server.use(
      http.get(`${baseUrl}/`, () => {
        return HttpResponse.json(payload);
      }),
    );

    await expect(createApi().getServerInfo()).resolves.toEqual(payload);
  });

  it('requests links with cursor support', async () => {
    const query = buildQuery({ cursor: 'cursor-token' });
    const response = {
      total: 2,
      linking_records: [
        { did: 'did:plc:one', collection: 'app.bsky.graph.follow', rkey: '1' },
        { did: 'did:plc:two', collection: 'app.bsky.graph.follow', rkey: '2' },
      ],
      cursor: 'next-cursor',
    };

    server.use(
      http.get(`${baseUrl}/links`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('target')).toBe(query.target);
        expect(url.searchParams.get('collection')).toBe(query.collection);
        expect(url.searchParams.get('path')).toBe(query.path);
        expect(url.searchParams.get('cursor')).toBe(query.cursor);

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getLinks(query)).resolves.toEqual(response);
  });

  it('retrieves distinct dids for a target', async () => {
    const query = buildQuery();
    const response = {
      total: 2,
      linking_dids: ['did:plc:one', 'did:plc:two'],
      cursor: null,
    };

    server.use(
      http.get(`${baseUrl}/links/distinct-dids`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('target')).toBe(query.target);
        expect(url.searchParams.get('collection')).toBe(query.collection);
        expect(url.searchParams.get('path')).toBe(query.path);

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getDistinctDids(query)).resolves.toEqual(response);
  });

  it('retrieves link counts', async () => {
    const query = buildQuery();
    const response = { total: 42 };

    server.use(
      http.get(`${baseUrl}/links/count`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('target')).toBe(query.target);
        expect(url.searchParams.get('collection')).toBe(query.collection);
        expect(url.searchParams.get('path')).toBe(query.path);

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getLinkCount(query)).resolves.toEqual(response);
  });

  it('retrieves distinct did counts', async () => {
    const query = buildQuery();
    const response = { total: 21 };

    server.use(
      http.get(`${baseUrl}/links/count/distinct-dids`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('target')).toBe(query.target);
        expect(url.searchParams.get('collection')).toBe(query.collection);
        expect(url.searchParams.get('path')).toBe(query.path);

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getDistinctDidCount(query)).resolves.toEqual(response);
  });

  it('retrieves aggregated link information', async () => {
    const response = {
      links: {
        'app.bsky.graph.follow': {
          '.subject': { records: 10, distinct_dids: 9 },
        },
      },
    };

    server.use(
      http.get(`${baseUrl}/links/all`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('target')).toBe('did:plc:example');

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getAllLinks({ target: 'did:plc:example' })).resolves.toEqual(response);
  });

  it('throws a descriptive error when the server responds with an error status', async () => {
    const query = buildQuery();

    server.use(
      http.get(`${baseUrl}/links`, () => {
        return HttpResponse.json({ message: 'nope' }, { status: 503, statusText: 'Service Unavailable' });
      }),
    );

    await expect(createApi().getLinks(query)).rejects.toThrow(
      'Constellation request failed with status 503 Service Unavailable',
    );
  });

  it('supports the createConstellationApi helper with custom headers', async () => {
    const query = buildQuery();
    const response = { total: 5 };
    const headers: HeaderCollector = {};

    server.use(
      http.get(`${baseUrl}/links/count`, ({ request }) => {
        headers.accept = request.headers.get('accept') ?? undefined;
        headers.custom = request.headers.get('x-akari-test') ?? undefined;

        return HttpResponse.json(response);
      }),
    );

    const api = createConstellationApi({
      baseUrl: `${baseUrl}/`,
      headers: { 'X-Akari-Test': 'constellation' },
    });

    await expect(api.getLinkCount(query)).resolves.toEqual(response);
    expect(headers.accept).toBe('application/json');
    expect(headers.custom).toBe('constellation');
  });
});
