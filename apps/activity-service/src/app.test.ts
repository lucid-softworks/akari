import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

type NotificationPage = {
  notifications: Array<{ indexedAt: string; reason?: string }>;
  cursor?: string;
};

// Mocked instance methods, reassigned per-test.
const listNotificationsMock =
  jest.fn<(jwt: string, limit?: number, cursor?: string) => Promise<NotificationPage>>();
const getProfileMock =
  jest.fn<(jwt: string, did: string) => Promise<{ indexedAt?: string } | null | undefined>>();

const constructorSpy = jest.fn<(pdsUrl: string) => void>();

// ts-jest (ESM->CJS interop) hoists jest.mock above the static import below, so
// the real network-backed BlueskyApi is never constructed.
jest.mock('bluesky-api', () => ({
  BlueskyApi: class {
    constructor(pdsUrl: string) {
      constructorSpy(pdsUrl);
    }
    listNotifications = listNotificationsMock;
    getProfile = getProfileMock;
  },
}));

// `.js` extension matches the source's ESM import convention.
import activityApp from './app.js';

type ActivitySummary = {
  generatedAt: string;
  periods: Record<string, Array<Record<string, number> & { date: string }>>;
  totals: { likes: number; reposts: number; quotes: number; replies: number; total: number };
  totalNotifications: number;
};

const ISO = (d: Date) => d.toISOString();

function makeSessionCookie(data: Record<string, unknown>): string {
  // Base64-encoded JSON, matching one of the formats parseSessionCookie accepts.
  return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');
}

function singlePage(notifications: NotificationPage['notifications']): void {
  listNotificationsMock.mockResolvedValue({ notifications, cursor: undefined });
}

beforeEach(() => {
  listNotificationsMock.mockReset();
  getProfileMock.mockReset();
  constructorSpy.mockReset();
  // Sensible defaults: one empty page so handlers don't loop forever.
  singlePage([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await activityApp.request('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });
});

describe('authentication', () => {
  it('returns 401 when no session or bearer token present', async () => {
    const res = await activityApp.request('/activity');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Missing session. Sign in again to continue.',
    });
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it('accepts a Bearer authorization header', async () => {
    const res = await activityApp.request('/activity', {
      headers: { authorization: 'Bearer my-token' },
    });
    expect(res.status).toBe(200);
    expect(listNotificationsMock).toHaveBeenCalledWith('my-token', 100, undefined);
  });

  it('accepts a base64-encoded JSON session cookie (jwtToken)', async () => {
    const cookie = makeSessionCookie({ jwtToken: 'cookie-jwt' });
    const res = await activityApp.request('/activity', {
      headers: { cookie: `session=${cookie}` },
    });
    expect(res.status).toBe(200);
    expect(listNotificationsMock).toHaveBeenCalledWith('cookie-jwt', 100, undefined);
  });

  it('accepts a plain JSON (non-base64) session cookie via accessJwt', async () => {
    const raw = JSON.stringify({ accessJwt: 'plain-jwt' });
    const res = await activityApp.request('/activity', {
      headers: { cookie: `session=${encodeURIComponent(raw)}` },
    });
    expect(res.status).toBe(200);
    expect(listNotificationsMock).toHaveBeenCalledWith('plain-jwt', 100, undefined);
  });

  it('falls back to the `token` field of the session', async () => {
    const cookie = makeSessionCookie({ token: 'token-field' });
    const res = await activityApp.request('/activity', {
      headers: { cookie: `session=${cookie}` },
    });
    expect(res.status).toBe(200);
    expect(listNotificationsMock).toHaveBeenCalledWith('token-field', 100, undefined);
  });

  it('treats an unparseable session cookie as no session (401)', async () => {
    const res = await activityApp.request('/activity', {
      headers: { cookie: 'session=%%%not-json-not-base64%%%' },
    });
    expect(res.status).toBe(401);
  });
});

describe('PDS URL resolution', () => {
  const auth = { authorization: 'Bearer t' };

  it('defaults to https://bsky.social', async () => {
    await activityApp.request('/activity', { headers: auth });
    expect(constructorSpy).toHaveBeenCalledWith('https://bsky.social');
  });

  it('uses the pdsUrl query parameter and strips trailing /xrpc', async () => {
    await activityApp.request('/activity?pdsUrl=https://pds.example/xrpc', { headers: auth });
    expect(constructorSpy).toHaveBeenCalledWith('https://pds.example');
  });

  it('strips a trailing slash from the x-pds-url header', async () => {
    await activityApp.request('/activity', {
      headers: { ...auth, 'x-pds-url': 'https://pds.example/' },
    });
    expect(constructorSpy).toHaveBeenCalledWith('https://pds.example');
  });

  it('uses the pdsUrl from the session when no query/header provided', async () => {
    const cookie = makeSessionCookie({ jwtToken: 't', pdsUrl: 'https://session.pds' });
    await activityApp.request('/activity', { headers: { cookie: `session=${cookie}` } });
    expect(constructorSpy).toHaveBeenCalledWith('https://session.pds');
  });

  it('falls back to default when pdsUrl is blank/whitespace', async () => {
    await activityApp.request('/activity?pdsUrl=%20%20', { headers: auth });
    expect(constructorSpy).toHaveBeenCalledWith('https://bsky.social');
  });
});

describe('notification pagination', () => {
  const auth = { authorization: 'Bearer t' };

  it('follows cursors across pages and stops when cursor is absent', async () => {
    listNotificationsMock
      .mockResolvedValueOnce({
        notifications: [{ indexedAt: ISO(new Date()), reason: 'like' }],
        cursor: 'c1',
      })
      .mockResolvedValueOnce({
        notifications: [{ indexedAt: ISO(new Date()), reason: 'repost' }],
        cursor: undefined,
      });

    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    expect(body.totalNotifications).toBe(2);
    expect(listNotificationsMock).toHaveBeenCalledTimes(2);
    expect(listNotificationsMock).toHaveBeenLastCalledWith('t', 100, 'c1');
  });

  it('stops when the same cursor repeats (avoids infinite loop)', async () => {
    listNotificationsMock.mockResolvedValue({
      notifications: [{ indexedAt: ISO(new Date()), reason: 'like' }],
      cursor: 'same',
    });

    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    // First page accepted, then loop continues once (cursor not yet seen), second
    // page returns the same cursor which is now in seenCursors -> break.
    expect(listNotificationsMock).toHaveBeenCalledTimes(2);
    expect(body.totalNotifications).toBe(2);
  });

  it('stops when a page returns zero notifications even with a cursor', async () => {
    listNotificationsMock.mockResolvedValueOnce({ notifications: [], cursor: 'c1' });
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    expect(listNotificationsMock).toHaveBeenCalledTimes(1);
    expect(body.totalNotifications).toBe(0);
  });
});

describe('activity aggregation and totals', () => {
  const auth = { authorization: 'Bearer t' };

  it('counts each reason type and an unknown reason into total only', async () => {
    const now = new Date();
    singlePage([
      { indexedAt: ISO(now), reason: 'like' },
      { indexedAt: ISO(now), reason: 'like' },
      { indexedAt: ISO(now), reason: 'repost' },
      { indexedAt: ISO(now), reason: 'quote' },
      { indexedAt: ISO(now), reason: 'reply' },
      { indexedAt: ISO(now), reason: 'follow' }, // unknown -> total only
    ]);

    const res = await activityApp.request('/activity', { headers: auth });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as ActivitySummary;
    expect(body.totals).toEqual({ likes: 2, reposts: 1, quotes: 1, replies: 1, total: 6 });
    expect(body.totalNotifications).toBe(6);
    expect(typeof body.generatedAt).toBe('string');
  });

  it('produces the full set of period buckets with expected lengths', async () => {
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;

    expect(Object.keys(body.periods).sort()).toEqual(['all', 'day', 'month', 'week', 'year']);
    expect(body.periods.day).toHaveLength(24);
    expect(body.periods.week).toHaveLength(7);
    expect(body.periods.month).toHaveLength(30);
    expect(body.periods.year).toHaveLength(12);
    expect(body.periods.all.length).toBeGreaterThanOrEqual(1);
  });

  it('ignores notifications older than a period window', async () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 400); // > 1 year
    singlePage([{ indexedAt: ISO(old), reason: 'like' }]);
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;

    const dayTotal = body.periods.day.reduce((s, b) => s + b.total, 0);
    const yearTotal = body.periods.year.reduce((s, b) => s + b.total, 0);
    expect(dayTotal).toBe(0);
    expect(yearTotal).toBe(0);
    // But still counted in overall totals.
    expect(body.totals.total).toBe(1);
  });

  it('skips notifications with an invalid indexedAt date', async () => {
    singlePage([
      { indexedAt: 'not-a-date', reason: 'like' },
      { indexedAt: ISO(new Date()), reason: 'like' },
    ]);
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    // totals still increments for both (summariseTotals doesn't validate dates).
    expect(body.totals.total).toBe(2);
    const dayTotal = body.periods.day.reduce((s, b) => s + b.total, 0);
    expect(dayTotal).toBe(1);
  });

  it('groups the all-time period by year for accounts older than 3 years', async () => {
    const fiveYearsAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 5);
    getProfileMock.mockResolvedValue({ indexedAt: ISO(fiveYearsAgo) });
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);

    const res = await activityApp.request('/activity?did=did:example:alice', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    // Year keys are 4-digit strings; month keys contain a dash.
    expect(body.periods.all.length).toBeGreaterThanOrEqual(5);
    expect(body.periods.all.every((b) => /^\d{4}$/.test(b.date))).toBe(true);
  });

  it('groups the all-time period by month for newer accounts', async () => {
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    expect(body.periods.all.every((b) => /^\d{4}-\d{2}$/.test(b.date))).toBe(true);
  });

  it('clamps a future account-creation date back to now (all-time period)', async () => {
    // Profile reports a creation date in the future -> start is reset to now.
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    getProfileMock.mockResolvedValue({ indexedAt: ISO(future) });
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);

    const res = await activityApp.request('/activity?did=did:example:future', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    expect(res.status).toBe(200);
    // Only a single (current) bucket should remain.
    expect(body.periods.all).toHaveLength(1);
  });

  it('skips invalid-dated notifications inside the all-time bucketing loop', async () => {
    getProfileMock.mockResolvedValue({ indexedAt: ISO(new Date('2022-01-01T00:00:00Z')) });
    singlePage([
      { indexedAt: 'garbage', reason: 'like' },
      { indexedAt: ISO(new Date()), reason: 'reply' },
    ]);
    const res = await activityApp.request('/activity?did=did:example:mixed', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    const allTotal = body.periods.all.reduce((s, b) => s + b.total, 0);
    // Only the valid-dated notification lands in an all-time bucket.
    expect(allTotal).toBe(1);
    expect(body.totals.total).toBe(2);
  });

  it('drops all-time notifications that fall outside the generated bucket range', async () => {
    // Account created recently -> monthly buckets only span the last ~few months,
    // but a notification timestamp older than the account-creation start still
    // gets included in the window via the earliest-timestamp extension. To hit the
    // "no matching bucket" path we use a year far in the future for the reason key
    // while keeping the start clamped: a notification dated well before any key.
    getProfileMock.mockResolvedValue({ indexedAt: ISO(new Date()) });
    singlePage([
      { indexedAt: ISO(new Date()), reason: 'like' },
      // Dated in the future relative to `now`; no bucket key was generated for it.
      { indexedAt: ISO(new Date(Date.now() + 1000 * 60 * 60 * 24 * 400)), reason: 'repost' },
    ]);
    const res = await activityApp.request('/activity?did=did:example:oob', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    const allTotal = body.periods.all.reduce((s, b) => s + b.total, 0);
    // Future notification has no bucket -> excluded from all-time aggregation.
    expect(allTotal).toBe(1);
    expect(body.totals.total).toBe(2);
  });

  it('uses earliest notification timestamp to extend the all-time window', async () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 200);
    singlePage([
      { indexedAt: ISO(old), reason: 'like' },
      { indexedAt: ISO(new Date()), reason: 'reply' },
    ]);
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    const allTotal = body.periods.all.reduce((s, b) => s + b.total, 0);
    expect(allTotal).toBe(2);
  });

  it('extends the window when a notification predates the profile creation date', async () => {
    // Profile says the account was created a year ago, but there is an older
    // notification -> earliestTimestamp is pushed back to the notification time.
    const profileStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
    getProfileMock.mockResolvedValue({ indexedAt: ISO(profileStart) });
    const older = new Date(Date.now() - 1000 * 60 * 60 * 24 * 500);
    singlePage([
      { indexedAt: ISO(older), reason: 'like' },
      { indexedAt: ISO(new Date()), reason: 'reply' },
    ]);
    const res = await activityApp.request('/activity?did=did:example:old', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    const allTotal = body.periods.all.reduce((s, b) => s + b.total, 0);
    expect(allTotal).toBe(2);
  });
});

describe('account creation date resolution', () => {
  const auth = { authorization: 'Bearer t' };

  it('uses the profile indexedAt when a did + profile are available', async () => {
    getProfileMock.mockResolvedValue({ indexedAt: ISO(new Date('2020-01-01T00:00:00Z')) });
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);
    const res = await activityApp.request('/activity?did=did:example:alice', { headers: auth });
    expect(res.status).toBe(200);
    expect(getProfileMock).toHaveBeenCalledWith('t', 'did:example:alice');
  });

  it('falls back to notification timestamps when getProfile throws', async () => {
    getProfileMock.mockRejectedValue(new Error('profile down'));
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);
    const res = await activityApp.request('/activity', {
      headers: { ...auth, 'x-did': 'did:example:bob' },
    });
    expect(res.status).toBe(200);
    expect(getProfileMock).toHaveBeenCalledWith('t', 'did:example:bob');
  });

  it('handles a profile that has no indexedAt field', async () => {
    getProfileMock.mockResolvedValue({});
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);
    const res = await activityApp.request('/activity?did=did:example:carol', { headers: auth });
    expect(res.status).toBe(200);
  });

  it('defaults to now when there are no notifications and no did', async () => {
    singlePage([]);
    const res = await activityApp.request('/activity', { headers: auth });
    const body = (await res.json()) as ActivitySummary;
    expect(res.status).toBe(200);
    expect(body.totalNotifications).toBe(0);
    // all-time still has at least one bucket for the current month.
    expect(body.periods.all.length).toBeGreaterThanOrEqual(1);
  });
});

describe('error handling', () => {
  it('returns 502 when fetching notifications fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    listNotificationsMock.mockRejectedValue(new Error('network down'));

    const res = await activityApp.request('/activity', {
      headers: { authorization: 'Bearer t' },
    });
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: 'Unable to load Bluesky activity at this time.',
    });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('root route', () => {
  it('the root path also serves the activity handler', async () => {
    singlePage([{ indexedAt: ISO(new Date()), reason: 'like' }]);
    const res = await activityApp.request('/', {
      headers: { authorization: 'Bearer t' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ActivitySummary;
    expect(body.totals.total).toBe(1);
  });
});
