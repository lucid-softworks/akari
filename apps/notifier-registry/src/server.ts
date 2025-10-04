import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { logger } from './logger.js';
import { SubscriptionStore } from './subscription-store.js';
import type { RegistryConfig, RegistryPayload } from './types.js';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

const setCorsHeaders = (res: ServerResponse, origin?: string) => {
  res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON payload.';
    throw new Error(`Failed to parse request body: ${message}`);
  }
};

const validatePayload = (raw: unknown): RegistryPayload => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Request body must be an object.');
  }

  const did = 'did' in raw && typeof (raw as { did?: unknown }).did === 'string' ? (raw as { did: string }).did : '';
  const expoPushToken =
    'expoPushToken' in raw && typeof (raw as { expoPushToken?: unknown }).expoPushToken === 'string'
      ? (raw as { expoPushToken: string }).expoPushToken
      : '';
  const devicePushToken =
    'devicePushToken' in raw && typeof (raw as { devicePushToken?: unknown }).devicePushToken === 'string'
      ? (raw as { devicePushToken: string }).devicePushToken
      : undefined;
  const platform =
    'platform' in raw && typeof (raw as { platform?: unknown }).platform === 'string'
      ? (raw as { platform: string }).platform
      : '';

  if (!did.trim()) {
    throw new Error('Request body must include a did.');
  }

  if (!expoPushToken.trim()) {
    throw new Error('Request body must include an Expo push token.');
  }

  if (!platform.trim()) {
    throw new Error('Request body must include a platform.');
  }

  return {
    did: did.trim(),
    expoPushToken: expoPushToken.trim(),
    devicePushToken: devicePushToken?.trim() || undefined,
    platform: platform.trim(),
  } satisfies RegistryPayload;
};

const verifyAuthorization = (req: IncomingMessage, token?: string): boolean => {
  if (!token) return true;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return false;
  }
  const provided = header.slice('Bearer '.length).trim();
  return provided === token;
};

const sendJson = (res: ServerResponse, statusCode: number, body: unknown): void => {
  res.writeHead(statusCode, JSON_HEADERS);
  res.end(body === undefined ? undefined : `${JSON.stringify(body)}\n`);
};

const sendError = (res: ServerResponse, statusCode: number, message: string): void => {
  sendJson(res, statusCode, { error: message });
};

export function createRegistryServer(config: RegistryConfig, store: SubscriptionStore) {
  return createServer(async (req, res) => {
    try {
      const origin = req.headers.origin;
      setCorsHeaders(res, origin);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url ? new URL(req.url, `http://${req.headers.host ?? 'localhost'}`) : null;
      const pathname = url?.pathname ?? '';

      if (req.method === 'GET' && pathname === '/subscriptions') {
        if (!verifyAuthorization(req, config.adminToken)) {
          sendError(res, 401, 'Invalid or missing authorization token.');
          return;
        }

        const subscriptions = store.getAll();
        sendJson(res, 200, subscriptions);
        return;
      }

      if (req.method === 'POST' && pathname === '/subscriptions') {
        if (!verifyAuthorization(req, config.clientToken)) {
          sendError(res, 401, 'Invalid or missing authorization token.');
          return;
        }

        const payload = validatePayload(await readBody(req));
        const result = await store.register(payload);
        logger.info('Registered Expo push token.', {
          did: payload.did,
          platform: payload.platform,
          isNewToken: result.isNewToken,
          totalTokens: result.totalTokens,
        });
        sendJson(res, 200, { success: true, totalTokens: result.totalTokens });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/subscriptions') {
        if (!verifyAuthorization(req, config.clientToken)) {
          sendError(res, 401, 'Invalid or missing authorization token.');
          return;
        }

        const payload = validatePayload(await readBody(req));
        const result = await store.unregister(payload);
        logger.info('Removed Expo push token.', {
          did: payload.did,
          platform: payload.platform,
          removed: result.removed,
          totalTokens: result.totalTokens,
        });
        sendJson(res, 200, { success: result.removed, totalTokens: result.totalTokens });
        return;
      }

      sendError(res, 404, 'Not found.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      logger.error('Registry request failed.', { message });
      sendError(res, 400, message);
    }
  });
}
