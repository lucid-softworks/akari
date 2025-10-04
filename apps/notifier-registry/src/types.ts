export type SubscriptionRecord = {
  did: string;
  tokens: string[];
};

export type RegistryPayload = {
  did: string;
  expoPushToken: string;
  devicePushToken?: string;
  platform: string;
};

export type RegistryConfig = {
  host: string;
  port: number;
  dataFile?: string;
  adminToken?: string;
  clientToken?: string;
};
