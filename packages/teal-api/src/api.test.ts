import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { TealApi, TEAL_COLLECTION } from './api';
import type { TealPlayRecord } from './types';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TealApi', () => {
  it('returns the latest play record when available', async () => {
    const record: TealPlayRecord = {
      trackName: 'Song',
      artists: [{ artistName: 'Artist' }],
      playedTime: '2024-01-01T00:00:00.000Z',
    };
    let receivedAuth: string | null = null;
    let paramsCaptured = false;
    let receivedParams: Record<string, string> = {};

    server.use(
      http.get('https://pds.example/xrpc/com.atproto.repo.listRecords', async ({ request }) => {
        receivedAuth = request.headers.get('authorization');
        const url = new URL(request.url);
        receivedParams = Object.fromEntries(url.searchParams.entries());
        paramsCaptured = true;

        return HttpResponse.json({
          records: [
            {
              uri: 'at://did:example:alice/app.play/1',
              cid: 'cid',
              value: record,
            },
          ],
        });
      }),
    );

    const api = new TealApi('https://pds.example');
    const result = await api.getLatestPlay('token', 'did:example:alice');

    expect(receivedAuth).toBe('Bearer token');
    expect(paramsCaptured).toBe(true);
    expect(receivedParams.collection).toBe(TEAL_COLLECTION);
    expect(receivedParams.repo).toBe('did:example:alice');
    expect(receivedParams.limit).toBe('1');
    expect(result).toEqual(record);
  });

  it('returns null when no records are returned', async () => {
    server.use(
      http.get('https://pds.example/xrpc/com.atproto.repo.listRecords', async () =>
        HttpResponse.json({ records: [] }),
      ),
    );

    const api = new TealApi('https://pds.example');
    const result = await api.getLatestPlay('token', 'did:example:alice');

    expect(result).toBeNull();
  });
});
