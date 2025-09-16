import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { getBlueskyIpConfig } from './ip';

describe('getBlueskyIpConfig', () => {
  const server = setupServer();

  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  it('returns the IP configuration when the request succeeds', async () => {
    const mockConfig = {
      countryCode: 'GB',
      regionCode: 'ENG',
      ageRestrictedGeos: [
        { countryCode: 'GB', regionCode: null },
        { countryCode: 'US', regionCode: 'SD' },
      ],
      ageBlockedGeos: [{ countryCode: 'US', regionCode: 'MS' }],
      isAgeRestrictedGeo: true,
    };

    server.use(
      http.get('https://ip.bsky.app/config', () => HttpResponse.json(mockConfig)),
    );

    const result = await getBlueskyIpConfig();

    expect(result).toEqual(mockConfig);
  });

  it('throws an error when the request fails', async () => {
    server.use(
      http.get(
        'https://ip.bsky.app/config',
        () =>
          HttpResponse.json(
            { message: 'error' },
            { status: 500, statusText: 'Internal Server Error' },
          ),
      ),
    );

    await expect(getBlueskyIpConfig()).rejects.toThrow('Failed to fetch Bluesky IP config');
  });
});
