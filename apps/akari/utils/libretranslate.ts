import { createLibreTranslateClient } from '@/libretranslate-api';

export * from '@/libretranslate-api';

let client: ReturnType<typeof createLibreTranslateClient> | null = null;

export const getLibreTranslateClient = () => {
  if (!client) {
    client = createLibreTranslateClient({
      endpoint: process.env.EXPO_PUBLIC_LIBRETRANSLATE_API_URL,
      apiKey: process.env.EXPO_PUBLIC_LIBRETRANSLATE_API_KEY || undefined,
    });
  }

  return client;
};

export const resetLibreTranslateClient = () => {
  client = null;
};
