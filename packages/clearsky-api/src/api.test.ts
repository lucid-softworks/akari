import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ClearSkyApi } from './api';

const baseUrl = 'https://example.com';
const server = setupServer();

type ApiTestCase = {
  name: string;
  path: string;
  response: Record<string, unknown>;
  call: (api: ClearSkyApi) => Promise<Record<string, unknown>>;
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

describe('ClearSkyApi', () => {
  const createApi = () => new ClearSkyApi(baseUrl);
  const timestamp = '2024-01-01T00:00:00.000Z';
  const specialHandle = 'user/with space';
  const specialDid = 'did:plc:abc123/456';
  const complexIdentifier = 'did:plc:complex/identifier';
  const placementIdentifier = 'user.place/test';
  const moderationName = 'cool lists';
  const subscribeListUrl = 'https://lists.example.com/list/123?mode=full';

  const basicCases: ApiTestCase[] = [
    {
      name: 'getDid returns DID information',
      path: `/api/v1/anon/get-did/${encodeURIComponent(specialHandle)}`,
      response: {
        data: {
          identifier: specialHandle,
          did_identifier: 'did:plc:special',
        },
      },
      call: (api) => api.getDid(specialHandle),
    },
    {
      name: 'getHandle returns handle information',
      path: `/api/v1/anon/get-handle/${encodeURIComponent(specialDid)}`,
      response: {
        data: {
          identifier: specialDid,
          handle_identifier: 'handle.test',
        },
      },
      call: (api) => api.getHandle(specialDid),
    },
    {
      name: 'getTotalUsers returns user statistics',
      path: '/api/v1/anon/total-users',
      response: {
        data: {
          active_count: { value: 120, displayName: 'Active' },
          total_count: { value: 500, displayName: 'Total' },
          deleted_count: { value: 10, displayName: 'Deleted' },
        },
        'as of': timestamp,
      },
      call: (api) => api.getTotalUsers(),
    },
    {
      name: 'validateHandle checks handle validity',
      path: `/api/v1/anon/validation/validate-handle/${encodeURIComponent(specialHandle)}`,
      response: {
        data: { valid: true },
        identity: 'clearsky',
      },
      call: (api) => api.validateHandle(specialHandle),
    },
    {
      name: 'getUriUrl resolves URI to URL',
      path: `/api/v1/anon/uri-url/${encodeURIComponent('at://did:plc:test/app.bsky.feed.post/123')}`,
      response: {
        data: { url: 'https://bsky.app/profile/test/post/123' },
      },
      call: (api) => api.getUriUrl('at://did:plc:test/app.bsky.feed.post/123'),
    },
    {
      name: 'getTopBlockStats returns top blocking data',
      path: '/api/v1/anon/lists/fun-facts',
      response: {
        data: {
          blocked: [{ did: 'did:plc:one', count: 5 }],
          blockers: [{ did: 'did:plc:two', count: 8 }],
        },
        'as of': timestamp,
      },
      call: (api) => api.getTopBlockStats(),
    },
    {
      name: 'getTopBlockStats24Hour returns recent blocking data',
      path: '/api/v1/anon/lists/funer-facts',
      response: {
        data: {
          blocked: [{ did: 'did:plc:three', count: 2 }],
          blockers: [{ did: 'did:plc:four', count: 3 }],
        },
        'as of': timestamp,
      },
      call: (api) => api.getTopBlockStats24Hour(),
    },
    {
      name: 'getBlockStats returns block statistics',
      path: '/api/v1/anon/lists/block-stats',
      response: {
        data: {
          numberOfTotalBlocks: 20,
          numberOfUniqueUsersBlocked: 10,
          numberOfUniqueUsersBlocking: 12,
          totalUsers: 200,
          percentUsersBlocked: 5,
          percentUsersBlocking: 6,
          numberBlock1: 3,
          numberBlocking2and100: 4,
          numberBlocking101and1000: 2,
          numberBlockingGreaterThan1000: 1,
          percentNumberBlocking1: 1,
          percentNumberBlocking2and100: 2,
          percentNumberBlocking101and1000: 3,
          percentNumberBlockingGreaterThan1000: 4,
          averageNumberOfBlocks: 1.5,
          numberBlocked1: 2,
          numberBlocked2and100: 3,
          numberBlocked101and1000: 1,
          numberBlockedGreaterThan1000: 0,
          percentNumberBlocked1: 1,
          percentNumberBlocked2and100: 2,
          percentNumberBlocked101and1000: 3,
          percentNumberBlockedGreaterThan1000: 4,
          averageNumberOfBlocked: 1.2,
        },
        'as of': timestamp,
      },
      call: (api) => api.getBlockStats(),
    },
    {
      name: 'getListTotal returns list count',
      path: `/api/v1/anon/get-list/total/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { count: 5 },
      },
      call: (api) => api.getListTotal(complexIdentifier),
    },
    {
      name: 'getBlocklistTotal returns blocklist count',
      path: `/api/v1/anon/blocklist/total/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { count: 7 },
      },
      call: (api) => api.getBlocklistTotal(complexIdentifier),
    },
    {
      name: 'getSingleBlocklistTotal returns blocklist count',
      path: `/api/v1/anon/single-blocklist/total/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { count: 9 },
      },
      call: (api) => api.getSingleBlocklistTotal(complexIdentifier),
    },
    {
      name: 'getProfile returns profile information',
      path: `/api/v1/anon/get-profile/${encodeURIComponent(complexIdentifier)}`,
      response: {
        data: {
          identifier: complexIdentifier,
          handle: 'profile.test',
          did_identifier: 'did:plc:profile',
          user_url: 'https://bsky.app/profile/profile.test',
          pds: 'https://pds.example.com',
          created_date: timestamp,
          placement: 42,
        },
      },
      call: (api) => api.getProfile(complexIdentifier),
    },
    {
      name: 'getDidsPerPds returns PDS counts',
      path: '/api/v1/anon/lists/dids-per-pds',
      response: {
        data: [
          { pds: 'https://pds.one', did_count: 100 },
          { pds: 'https://pds.two', did_count: 50 },
        ],
      },
      call: (api) => api.getDidsPerPds(),
    },
    {
      name: 'getHandleHistory returns history entries',
      path: `/api/v1/anon/get-handle-history/${encodeURIComponent(specialHandle)}`,
      response: {
        data: {
          identifier: specialHandle,
          handle_history: [
            ['2023-01-01', 'old.handle', 'reason'],
            ['2024-01-01', 'new.handle', 'reason'],
          ],
        },
      },
      call: (api) => api.getHandleHistory(specialHandle),
    },
    {
      name: 'getTimeBehind returns time behind data',
      path: '/api/v1/anon/status/time-behind',
      response: {
        data: {
          'time behind': '5 minutes',
        },
      },
      call: (api) => api.getTimeBehind(),
    },
    {
      name: 'getLabelers returns labeler list',
      path: '/api/v1/anon/get-labelers',
      response: {
        data: [
          {
            did: 'did:plc:labeler',
            endpoint: 'https://labeler.example.com',
            name: 'Labeler',
            description: 'Moderation labeler',
            created_date: timestamp,
          },
        ],
      },
      call: (api) => api.getLabelers(),
    },
    {
      name: 'getPlacement returns placement information',
      path: `/api/v1/anon/placement/${encodeURIComponent(placementIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { placement: 17 },
      },
      call: (api) => api.getPlacement(placementIdentifier),
    },
    {
      name: 'getStarterPacksTotal returns total starter packs created',
      path: `/api/v1/anon/starter-packs/total/${encodeURIComponent(specialHandle)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { count: 4 },
      },
      call: (api) => api.getStarterPacksTotal(specialHandle),
    },
    {
      name: 'getSingleStarterPackTotal returns total starter packs joined',
      path: `/api/v1/anon/single-starter-pack/total/${encodeURIComponent(specialHandle)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { count: 6 },
      },
      call: (api) => api.getSingleStarterPackTotal(specialHandle),
    },
  ];

  for (const testCase of basicCases) {
    it(testCase.name, async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get(`${baseUrl}${testCase.path}`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(testCase.response);
        }),
      );

      const api = createApi();
      const result = await testCase.call(api);

      expect(capturedUrl).toBe(`${baseUrl}${testCase.path}`);
      expect(result).toEqual(testCase.response);
    });
  }

  const paginatedCases: ApiTestCase[] = [
    {
      name: 'getList returns moderation lists when no page provided',
      path: `/api/v1/anon/get-list/${encodeURIComponent(complexIdentifier)}`,
      response: {
        data: {
          identifier: complexIdentifier,
          lists: [],
        },
      },
      call: (api) => api.getList(complexIdentifier),
    },
    {
      name: 'getList returns moderation lists for a specific page',
      path: `/api/v1/anon/get-list/${encodeURIComponent(complexIdentifier)}/2`,
      response: {
        data: {
          identifier: complexIdentifier,
          lists: [],
        },
      },
      call: (api) => api.getList(complexIdentifier, { page: 2 }),
    },
    {
      name: 'getBlocklist returns blocking lists without page',
      path: `/api/v1/anon/blocklist/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklist: [] },
      },
      call: (api) => api.getBlocklist(complexIdentifier),
    },
    {
      name: 'getBlocklist returns blocking lists for a page',
      path: `/api/v1/anon/blocklist/${encodeURIComponent(complexIdentifier)}/3`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklist: [] },
      },
      call: (api) => api.getBlocklist(complexIdentifier, { page: 3 }),
    },
    {
      name: 'getSingleBlocklist returns blocked lists without page',
      path: `/api/v1/anon/single-blocklist/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklist: [] },
      },
      call: (api) => api.getSingleBlocklist(complexIdentifier),
    },
    {
      name: 'getSingleBlocklist returns blocked lists for a page',
      path: `/api/v1/anon/single-blocklist/${encodeURIComponent(complexIdentifier)}/4`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklist: [] },
      },
      call: (api) => api.getSingleBlocklist(complexIdentifier, { page: 4 }),
    },
    {
      name: 'getSubscribeBlocksBlocklist returns subscribe blocklists without page',
      path: `/api/v1/anon/subscribe-blocks-blocklist/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklists: [] },
      },
      call: (api) => api.getSubscribeBlocksBlocklist(complexIdentifier),
    },
    {
      name: 'getSubscribeBlocksBlocklist returns subscribe blocklists for a page',
      path: `/api/v1/anon/subscribe-blocks-blocklist/${encodeURIComponent(complexIdentifier)}/5`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklists: [] },
      },
      call: (api) => api.getSubscribeBlocksBlocklist(complexIdentifier, { page: 5 }),
    },
    {
      name: 'getSubscribeBlocksSingleBlocklist returns blocklists without page',
      path: `/api/v1/anon/subscribe-blocks-single-blocklist/${encodeURIComponent(complexIdentifier)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklists: [] },
      },
      call: (api) => api.getSubscribeBlocksSingleBlocklist(complexIdentifier),
    },
    {
      name: 'getSubscribeBlocksSingleBlocklist returns blocklists for a page',
      path: `/api/v1/anon/subscribe-blocks-single-blocklist/${encodeURIComponent(complexIdentifier)}/6`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { blocklists: [] },
      },
      call: (api) => api.getSubscribeBlocksSingleBlocklist(complexIdentifier, { page: 6 }),
    },
    {
      name: 'getSubscribeBlocksSingleBlocklistUsers returns users without page',
      path: `/api/v1/anon/subscribe-blocks-single-blocklist/users/${encodeURIComponent(subscribeListUrl)}`,
      response: {
        identity: 'clearsky',
        data: { blocklist: { users: [] } },
      },
      call: (api) => api.getSubscribeBlocksSingleBlocklistUsers(subscribeListUrl),
    },
    {
      name: 'getSubscribeBlocksSingleBlocklistUsers returns users for a page',
      path: `/api/v1/anon/subscribe-blocks-single-blocklist/users/${encodeURIComponent(subscribeListUrl)}/7`,
      response: {
        identity: 'clearsky',
        data: { blocklist: { users: [] } },
      },
      call: (api) => api.getSubscribeBlocksSingleBlocklistUsers(subscribeListUrl, { page: 7 }),
    },
    {
      name: 'searchModerationLists returns results without page',
      path: `/api/v1/anon/search/moderation-lists/${encodeURIComponent(moderationName)}`,
      response: {
        input: moderationName,
        data: { lists: [], pages: 1 },
      },
      call: (api) => api.searchModerationLists(moderationName),
    },
    {
      name: 'searchModerationLists returns results for a page',
      path: `/api/v1/anon/search/moderation-lists/${encodeURIComponent(moderationName)}/8`,
      response: {
        input: moderationName,
        data: { lists: [], pages: 2 },
      },
      call: (api) => api.searchModerationLists(moderationName, { page: 8 }),
    },
    {
      name: 'getLabelers returns labelers for a page',
      path: '/api/v1/anon/get-labelers/9',
      response: {
        data: [
          {
            did: 'did:plc:labeler2',
            endpoint: 'https://labeler2.example.com',
            name: 'Labeler Two',
            description: 'Secondary labeler',
            created_date: timestamp,
          },
        ],
      },
      call: (api) => api.getLabelers({ page: 9 }),
    },
    {
      name: 'getStarterPacks returns starter packs without page',
      path: `/api/v1/anon/starter-packs/${encodeURIComponent(specialHandle)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { starter_packs: [] },
      },
      call: (api) => api.getStarterPacks(specialHandle),
    },
    {
      name: 'getStarterPacks returns starter packs for a page',
      path: `/api/v1/anon/starter-packs/${encodeURIComponent(specialHandle)}/10`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { starter_packs: [] },
      },
      call: (api) => api.getStarterPacks(specialHandle, { page: 10 }),
    },
    {
      name: 'getSingleStarterPack returns starter packs without page',
      path: `/api/v1/anon/single-starter-pack/${encodeURIComponent(specialHandle)}`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { starter_packs: [] },
      },
      call: (api) => api.getSingleStarterPack(specialHandle),
    },
    {
      name: 'getSingleStarterPack returns starter packs for a page',
      path: `/api/v1/anon/single-starter-pack/${encodeURIComponent(specialHandle)}/11`,
      response: {
        identity: 'clearsky',
        status: true,
        data: { starter_packs: [] },
      },
      call: (api) => api.getSingleStarterPack(specialHandle, { page: 11 }),
    },
  ];

  for (const testCase of paginatedCases) {
    it(testCase.name, async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get(`${baseUrl}${testCase.path}`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(testCase.response);
        }),
      );

      const api = createApi();
      const result = await testCase.call(api);

      expect(capturedUrl).toBe(`${baseUrl}${testCase.path}`);
      expect(result).toEqual(testCase.response);
    });
  }

  it('fetches the logo as a blob', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/anon/images/logo`, () =>
        HttpResponse.text('logo-bytes', { headers: { 'Content-Type': 'image/png' } }),
      ),
    );

    const api = createApi();
    const blob = await api.getLogo();

    expect(await blob.text()).toBe('logo-bytes');
  });

  it('throws an error when the logo request fails', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/anon/images/logo`, () =>
        HttpResponse.text('missing', { status: 404, statusText: 'Not Found' }),
      ),
    );

    const api = createApi();

    await expect(api.getLogo()).rejects.toThrow('Failed to fetch logo: 404');
  });
});
