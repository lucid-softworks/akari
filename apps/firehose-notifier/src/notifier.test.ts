import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockChunkPushNotifications = jest.fn<(messages: unknown[]) => unknown[][]>();
const mockSendPushNotificationsAsync = jest.fn<(chunk: unknown[]) => Promise<unknown[]>>();
const mockIsExpoPushToken = jest.fn<(token: unknown) => boolean>();
const mockExpoConstructor = jest.fn<(options?: unknown) => void>();

jest.mock('expo-server-sdk', () => {
  class Expo {
    chunkPushNotifications = mockChunkPushNotifications;
    sendPushNotificationsAsync = mockSendPushNotificationsAsync;
    static isExpoPushToken = mockIsExpoPushToken;

    constructor(options?: unknown) {
      mockExpoConstructor(options);
    }
  }
  return { Expo };
});

import { ExpoNotifier } from './notifier.js';

const subscription = { did: 'did:plc:abc', tokens: ['valid-1', 'invalid', 'valid-2'] };
const message = {
  title: 'New like',
  body: 'someone liked your post',
  data: { reason: 'like' as const, actorDid: 'did:plc:other' },
};

describe('ExpoNotifier', () => {
  let infoSpy: ReturnType<typeof jest.spyOn>;
  let warnSpy: ReturnType<typeof jest.spyOn>;
  let errorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockChunkPushNotifications.mockReset();
    mockSendPushNotificationsAsync.mockReset();
    mockIsExpoPushToken.mockReset();
    mockExpoConstructor.mockReset();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes the access token to the Expo constructor', () => {
    new ExpoNotifier('my-token');
    expect(mockExpoConstructor).toHaveBeenCalledWith({ accessToken: 'my-token' });
  });

  it('filters invalid tokens, builds payloads, chunks, sends and logs ok tickets', async () => {
    mockIsExpoPushToken.mockImplementation((token: unknown) => token !== 'invalid');
    const payloadChunk = [{ to: 'valid-1' }, { to: 'valid-2' }];
    mockChunkPushNotifications.mockReturnValue([payloadChunk]);
    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', message: 'bad token', details: { error: 'DeviceNotRegistered' } },
    ]);

    const notifier = new ExpoNotifier();
    await notifier.send(subscription, message);

    // the invalid token was warned about
    expect(warnSpy).toHaveBeenCalled();
    // payloads only built for the 2 valid tokens
    const builtPayloads = mockChunkPushNotifications.mock.calls[0][0] as Array<{ to: string }>;
    expect(builtPayloads.map((p) => p.to)).toEqual(['valid-1', 'valid-2']);
    expect(builtPayloads[0]).toMatchObject({
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data,
    });
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledWith(payloadChunk);
    // one ok ticket logged as info, one error ticket logged as error
    expect(infoSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns early and warns when there are no valid tokens', async () => {
    mockIsExpoPushToken.mockReturnValue(false);
    const notifier = new ExpoNotifier();
    await notifier.send(subscription, message);

    expect(mockChunkPushNotifications).not.toHaveBeenCalled();
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('logs an error when sending a chunk throws (Error instance)', async () => {
    mockIsExpoPushToken.mockReturnValue(true);
    mockChunkPushNotifications.mockReturnValue([[{ to: 'valid-1' }]]);
    mockSendPushNotificationsAsync.mockRejectedValue(new Error('boom'));

    const notifier = new ExpoNotifier();
    await notifier.send({ did: 'did:plc:abc', tokens: ['valid-1'] }, message);

    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs an error when sending a chunk throws a non-Error', async () => {
    mockIsExpoPushToken.mockReturnValue(true);
    mockChunkPushNotifications.mockReturnValue([[{ to: 'valid-1' }]]);
    mockSendPushNotificationsAsync.mockRejectedValue('string failure');

    const notifier = new ExpoNotifier();
    await notifier.send({ did: 'did:plc:abc', tokens: ['valid-1'] }, message);

    expect(errorSpy).toHaveBeenCalled();
  });
});
