import { Hono } from 'hono';
import type { Handler } from 'hono';
import { getCookie } from 'hono/cookie';
import { BlueskyApi, type BlueskyNotification } from 'bluesky-api';

const DEFAULT_PDS_URL = 'https://bsky.social';
const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const YEAR_IN_MS = 365 * DAY_IN_MS;

export type ActivityPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export type ActivityCounts = {
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  total: number;
};

export type ActivityBucket = ActivityCounts & {
  date: string;
};

export type ActivityTimeline = Record<ActivityPeriod, ActivityBucket[]>;

export type ActivitySummary = {
  generatedAt: string;
  periods: ActivityTimeline;
  totals: ActivityCounts;
  totalNotifications: number;
};

type SessionData = {
  jwtToken?: string;
  accessJwt?: string;
  token?: string;
  pdsUrl?: string;
  did?: string;
};

type AggregationConfig = {
  startTime: Date;
  points: number;
  granularity: 'hour' | 'day' | 'month';
  getKey: (date: Date) => string;
};

const activityApp = new Hono();

const handleActivity: Handler = async (c) => {
  const session = parseSessionCookie(getCookie(c, 'session'));
  const bearerToken = extractBearerToken(c.req.header('authorization'));
  const accessJwt = bearerToken ?? session?.jwtToken ?? session?.accessJwt ?? session?.token;

  if (!accessJwt) {
    return c.json({ error: 'Missing session. Sign in again to continue.' }, 401);
  }

  const requestedPdsUrl = c.req.query('pdsUrl') ?? c.req.header('x-pds-url');
  const pdsUrl = normalizePdsUrl(requestedPdsUrl ?? session?.pdsUrl ?? DEFAULT_PDS_URL);
  const did = c.req.query('did') ?? c.req.header('x-did') ?? session?.did;

  try {
    const api = new BlueskyApi(pdsUrl);
    const notifications = await fetchAllNotifications(api, accessJwt);
    const accountCreationDate = await resolveAccountCreationDate(api, accessJwt, did, notifications);
    const periods = aggregateNotifications(notifications, accountCreationDate);
    const totals = summariseTotals(notifications);

    c.header('Cache-Control', 'no-store');
    return c.json<ActivitySummary>({
      generatedAt: new Date().toISOString(),
      periods,
      totals,
      totalNotifications: notifications.length,
    });
  } catch (error) {
    console.error('Failed to produce activity timeline', error);
    return c.json({ error: 'Unable to load Bluesky activity at this time.' }, 502);
  }
};

activityApp.get('/', handleActivity);
activityApp.get('/activity', handleActivity);

activityApp.get('/health', (c) => c.json({ status: 'ok' }));

export default activityApp;

function formatHourKey(date: Date): string {
  const truncated = new Date(date);
  truncated.setUTCMinutes(0, 0, 0);
  const iso = truncated.toISOString();
  return `${iso.slice(0, 13)}:00`;
}

function formatDayKey(date: Date): string {
  const truncated = new Date(date);
  truncated.setUTCHours(0, 0, 0, 0);
  return truncated.toISOString().split('T')[0];
}

function formatMonthKey(date: Date): string {
  const truncated = new Date(date);
  return `${truncated.getUTCFullYear()}-${String(truncated.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatYearKey(date: Date): string {
  return String(date.getUTCFullYear());
}

async function fetchAllNotifications(api: BlueskyApi, accessJwt: string): Promise<BlueskyNotification[]> {
  const notifications: BlueskyNotification[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const page = await api.listNotifications(accessJwt, 100, cursor);

    for (const notification of page.notifications) {
      notifications.push(notification);
    }

    if (!page.cursor || seenCursors.has(page.cursor) || page.notifications.length === 0) {
      break;
    }

    seenCursors.add(page.cursor);
    cursor = page.cursor;
  }

  return notifications;
}

async function resolveAccountCreationDate(
  api: BlueskyApi,
  accessJwt: string,
  did: string | undefined,
  notifications: BlueskyNotification[],
): Promise<Date> {
  if (did) {
    try {
      const profile = await api.getProfile(accessJwt, did);
      if (profile?.indexedAt) {
        return new Date(profile.indexedAt);
      }
    } catch (error) {
      console.warn('Unable to resolve profile creation date from Bluesky profile', error);
    }
  }

  let earliestTimestamp = Number.POSITIVE_INFINITY;
  for (const notification of notifications) {
    const timestamp = new Date(notification.indexedAt).getTime();
    if (!Number.isNaN(timestamp) && timestamp < earliestTimestamp) {
      earliestTimestamp = timestamp;
    }
  }

  if (Number.isFinite(earliestTimestamp)) {
    return new Date(earliestTimestamp);
  }

  return new Date();
}

function aggregateNotifications(
  notifications: BlueskyNotification[],
  accountCreationDate: Date,
): ActivityTimeline {
  const now = new Date();

  const configs: Record<Exclude<ActivityPeriod, 'all'>, AggregationConfig> = {
    day: {
      startTime: new Date(now.getTime() - DAY_IN_MS),
      points: 24,
      granularity: 'hour',
      getKey: (date) => formatHourKey(date),
    },
    week: {
      startTime: new Date(now.getTime() - 7 * DAY_IN_MS),
      points: 7,
      granularity: 'day',
      getKey: (date) => formatDayKey(date),
    },
    month: {
      startTime: new Date(now.getTime() - 30 * DAY_IN_MS),
      points: 30,
      granularity: 'day',
      getKey: (date) => formatDayKey(date),
    },
    year: {
      startTime: new Date(now.getTime() - YEAR_IN_MS),
      points: 12,
      granularity: 'month',
      getKey: (date) => formatMonthKey(date),
    },
  };

  const periods: Record<ActivityPeriod, ActivityBucket[]> = {
    day: bucketise(notifications, configs.day),
    week: bucketise(notifications, configs.week),
    month: bucketise(notifications, configs.month),
    year: bucketise(notifications, configs.year),
    all: bucketiseAll(notifications, accountCreationDate),
  };

  return periods;
}

function bucketise(notifications: BlueskyNotification[], config: AggregationConfig): ActivityBucket[] {
  const buckets = new Map<string, ActivityBucket>();
  const presetKeys = generateBuckets(config);

  for (const key of presetKeys) {
    buckets.set(key, createEmptyBucket(key));
  }

  for (const notification of notifications) {
    const indexedDate = new Date(notification.indexedAt);
    if (Number.isNaN(indexedDate.getTime()) || indexedDate < config.startTime) {
      continue;
    }

    const key = config.getKey(indexedDate);
    const bucket = buckets.get(key) ?? createEmptyBucket(key);
    incrementCounts(bucket, notification.reason);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function bucketiseAll(notifications: BlueskyNotification[], accountCreationDate: Date): ActivityBucket[] {
  const now = new Date();
  let start = new Date(accountCreationDate);

  if (Number.isNaN(start.getTime()) || start > now) {
    start = new Date(now);
  }

  let earliestTimestamp = start.getTime();
  for (const notification of notifications) {
    const timestamp = new Date(notification.indexedAt).getTime();
    if (!Number.isNaN(timestamp) && timestamp < earliestTimestamp) {
      earliestTimestamp = timestamp;
    }
  }

  start = new Date(Math.min(start.getTime(), earliestTimestamp));
  const accountAgeYears = Math.max((now.getTime() - start.getTime()) / YEAR_IN_MS, 0);
  const groupByMonth = accountAgeYears < 3;
  const bucketKeys = generateAllBuckets(start, now, groupByMonth);
  const buckets = new Map<string, ActivityBucket>();

  for (const key of bucketKeys) {
    buckets.set(key, createEmptyBucket(key));
  }

  for (const notification of notifications) {
    const indexedDate = new Date(notification.indexedAt);
    if (Number.isNaN(indexedDate.getTime())) {
      continue;
    }

    const key = groupByMonth ? formatMonthKey(indexedDate) : formatYearKey(indexedDate);
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    incrementCounts(bucket, notification.reason);
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function generateBuckets(config: AggregationConfig): string[] {
  const now = new Date();
  const keys: string[] = [];

  for (let index = 0; index < config.points; index += 1) {
    const time = new Date(now);
    const offset = config.points - index - 1;

    if (config.granularity === 'hour') {
      time.setUTCHours(time.getUTCHours() - offset, 0, 0, 0);
    } else if (config.granularity === 'day') {
      time.setUTCDate(time.getUTCDate() - offset);
      time.setUTCHours(0, 0, 0, 0);
    } else {
      time.setUTCMonth(time.getUTCMonth() - offset, 1);
      time.setUTCHours(0, 0, 0, 0);
    }

    keys.push(config.getKey(time));
  }

  return keys;
}

function generateAllBuckets(start: Date, end: Date, monthly: boolean): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);

  if (monthly) {
    cursor.setUTCDate(1);
    while (cursor <= end) {
      keys.push(formatMonthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
    }
  } else {
    cursor.setUTCMonth(0, 1);
    while (cursor <= end) {
      keys.push(formatYearKey(cursor));
      cursor.setUTCFullYear(cursor.getUTCFullYear() + 1, 0, 1);
    }
  }

  if (keys.length === 0) {
    keys.push(monthly ? formatMonthKey(end) : formatYearKey(end));
  }

  return keys;
}

function createEmptyBucket(date: string): ActivityBucket {
  return {
    date,
    likes: 0,
    reposts: 0,
    quotes: 0,
    replies: 0,
    total: 0,
  };
}

function incrementCounts(target: ActivityCounts, reason?: string): void {
  target.total += 1;

  switch (reason) {
    case 'like':
      target.likes += 1;
      break;
    case 'repost':
      target.reposts += 1;
      break;
    case 'quote':
      target.quotes += 1;
      break;
    case 'reply':
      target.replies += 1;
      break;
    default:
      break;
  }
}

function summariseTotals(notifications: BlueskyNotification[]): ActivityCounts {
  const totals: ActivityCounts = {
    likes: 0,
    reposts: 0,
    quotes: 0,
    replies: 0,
    total: 0,
  };

  for (const notification of notifications) {
    incrementCounts(totals, notification.reason);
  }

  return totals;
}

function parseSessionCookie(value: string | undefined): SessionData | null {
  if (!value) {
    return null;
  }

  const attempts = new Set<string>();
  attempts.add(value);

  try {
    attempts.add(decodeURIComponent(value));
  } catch {
    // Ignore decoding failures – value may not be URL encoded.
  }

  for (const attempt of Array.from(attempts)) {
    try {
      const decoded = Buffer.from(attempt, 'base64').toString('utf-8');
      if (decoded) {
        attempts.add(decoded);
      }
    } catch {
      // Value was not base64 encoded – continue.
    }
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as SessionData;
    } catch {
      // Not valid JSON – try next candidate.
    }
  }

  return null;
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function normalizePdsUrl(url: string | undefined): string {
  if (!url) {
    return DEFAULT_PDS_URL;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return DEFAULT_PDS_URL;
  }

  if (trimmed.endsWith('/xrpc')) {
    return trimmed.slice(0, -5);
  }

  if (trimmed.endsWith('/')) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}
