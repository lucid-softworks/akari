export type InteractionReason = 'follow' | 'like' | 'reply' | 'repost';

export type Subscription = {
  did: string;
  tokens: string[];
};

export type NotifierConfig = {
  expoAccessToken?: string;
  registry: NotifierRegistryConfig;
};

export type NotifierRegistryConfig = {
  endpoint: string;
  bearerToken?: string;
  refreshIntervalMs?: number;
};

export type ExpoNotificationPayload = {
  reason: InteractionReason;
  actorDid: string;
  subjectUri?: string;
  replyUri?: string;
  recordCid?: string;
};

export type NotificationMessage = {
  title: string;
  body: string;
  data: ExpoNotificationPayload;
};
