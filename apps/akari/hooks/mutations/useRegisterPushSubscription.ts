import { useMutation } from '@tanstack/react-query';

type RegisterPushSubscriptionPayload = {
  did: string;
  expoPushToken: string;
  platform: string;
  devicePushToken?: string;
};

export function useRegisterPushSubscription() {
  return useMutation({
    mutationFn: async (payload: RegisterPushSubscriptionPayload) => {
      const endpoint = process.env.EXPO_PUBLIC_PUSH_REGISTRY_URL?.trim();
      if (!endpoint) {
        throw new Error('EXPO_PUBLIC_PUSH_REGISTRY_URL is not configured.');
      }

      const registryUrl = endpoint.replace(/\/+$/, '');

      const response = await fetch(`${registryUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          did: payload.did,
          expoPushToken: payload.expoPushToken,
          devicePushToken: payload.devicePushToken,
          platform: payload.platform,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to create push subscription: ${response.status} ${response.statusText} - ${body}`);
      }
    },
  });
}

export type { RegisterPushSubscriptionPayload };
