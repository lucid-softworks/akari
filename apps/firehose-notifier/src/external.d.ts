declare module '@skyware/jetstream' {
  export type CommitCreateEvent<TCollection extends string = string> = {
    did: string;
    commit: {
      collection: TCollection;
      record: unknown;
      rkey: string;
    };
  };

  export type JetstreamOptions<TCollection extends string> = {
    endpoint?: string;
    wantedCollections?: readonly TCollection[];
  };

  export class Jetstream<TCollection extends string = string> {
    constructor(options?: JetstreamOptions<TCollection>);

    start(): void;
    close(): void;

    on(event: 'open', listener: () => void): void;
    on(event: 'close', listener: () => void): void;
    on(event: 'error', listener: (error: unknown, cursor?: string) => void): void;
    onCreate<T extends TCollection>(collection: T, listener: (event: CommitCreateEvent<T>) => void): void;
  }
}

declare module 'expo-server-sdk' {
  export type ExpoPushMessage = {
    to: string;
    sound?: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };

  export type ExpoPushTicket = {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
  };

  export type ExpoOptions = {
    accessToken?: string;
  };

  export class Expo {
    constructor(options?: ExpoOptions);

    static isExpoPushToken(token: string): boolean;

    chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][];
    sendPushNotificationsAsync(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
  }
}
