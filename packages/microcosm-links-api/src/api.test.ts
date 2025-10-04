import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MicrocosmLinksApi } from './api';
import { createMicrocosmLinksApi } from './index';

type HeaderCollector = {
  accept?: string;
  custom?: string;
};

const baseUrl = 'https://microcosm.test';
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('MicrocosmLinksApi', () => {
  const createApi = () => new MicrocosmLinksApi(baseUrl, { userAgent: 'akari-tests' });

  it('retrieves backlinks with cursor and did filters', async () => {
    const query = {
      subject: 'at://did:plc:example/app.bsky.feed.post/abc',
      source: 'app.bsky.feed.like:subject.uri',
      limit: 25,
      cursor: 'cursor-token',
      did: ['did:plc:one', 'did:plc:two'],
    } as const;

    const response = {
      total: 2,
      records: [
        { did: 'did:plc:one', collection: 'app.bsky.feed.like', rkey: '1' },
        { did: 'did:plc:two', collection: 'app.bsky.feed.like', rkey: '2' },
      ],
      cursor: 'next-cursor',
    };

    server.use(
      http.get(`${baseUrl}/xrpc/blue.microcosm.links.getBacklinks`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('subject')).toBe(query.subject);
        expect(url.searchParams.get('source')).toBe(query.source);
        expect(url.searchParams.get('limit')).toBe(String(query.limit));
        expect(url.searchParams.get('cursor')).toBe(query.cursor);
        expect(url.searchParams.getAll('did')).toEqual([...query.did]);

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getBacklinks(query)).resolves.toEqual(response);
  });

  it('retrieves many-to-many counts with optional filters', async () => {
    const query = {
      subject: 'at://did:plc:example/app.bsky.feed.post/abc',
      source: 'app.bsky.feed.like:subject.uri',
      pathToOther: 'subject.uri',
      limit: 10,
      otherSubject: [
        'at://did:plc:example/app.bsky.feed.post/abc',
        'at://did:plc:other/app.bsky.feed.post/def',
      ],
    } as const;

    const response = {
      counts_by_other_subject: [
        { subject: query.otherSubject[0], total: 5, distinct: 5 },
        { subject: query.otherSubject[1], total: 3, distinct: 3 },
      ],
      cursor: null,
    };

    server.use(
      http.get(`${baseUrl}/xrpc/blue.microcosm.links.getManyToManyCounts`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('subject')).toBe(query.subject);
        expect(url.searchParams.get('source')).toBe(query.source);
        expect(url.searchParams.get('pathToOther')).toBe(query.pathToOther);
        expect(url.searchParams.get('limit')).toBe(String(query.limit));
        expect(url.searchParams.getAll('otherSubject')).toEqual([...query.otherSubject]);

        return HttpResponse.json(response);
      }),
    );

    await expect(createApi().getManyToManyCounts(query)).resolves.toEqual(response);
  });

  it('throws a descriptive error when the request fails', async () => {
    const query = {
      subject: 'at://did:plc:example/app.bsky.feed.post/abc',
      source: 'app.bsky.feed.like:subject.uri',
    };

    server.use(
      http.get(`${baseUrl}/xrpc/blue.microcosm.links.getBacklinks`, () => {
        return HttpResponse.json({ message: 'nope' }, { status: 502, statusText: 'Bad Gateway' });
      }),
    );

    await expect(createApi().getBacklinks(query)).rejects.toThrow(
      'Microcosm request failed with status 502 Bad Gateway',
    );
  });

  it('supports the factory helper with custom headers', async () => {
    const query = {
      subject: 'at://did:plc:example/app.bsky.feed.post/abc',
      source: 'app.bsky.feed.like:subject.uri',
    };

    const response = {
      total: 0,
      records: [],
      cursor: null,
    };

    const headers: HeaderCollector = {};

    server.use(
      http.get(`${baseUrl}/xrpc/blue.microcosm.links.getBacklinks`, ({ request }) => {
        headers.accept = request.headers.get('accept') ?? undefined;
        headers.custom = request.headers.get('x-akari-test') ?? undefined;

        return HttpResponse.json(response);
      }),
    );

    const api = createMicrocosmLinksApi({
      baseUrl: `${baseUrl}/`,
      headers: { 'X-Akari-Test': 'microcosm' },
      userAgent: 'akari-tests',
    });

    await expect(api.getBacklinks(query)).resolves.toEqual(response);
    expect(headers.accept).toBe('application/json');
    expect(headers.custom).toBe('microcosm');
  });
});
