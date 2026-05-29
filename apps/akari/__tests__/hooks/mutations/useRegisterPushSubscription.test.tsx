import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRegisterPushSubscription } from '@/hooks/mutations/useRegisterPushSubscription';

describe('useRegisterPushSubscription mutation hook', () => {
  const ORIGINAL_ENV = process.env.EXPO_PUBLIC_PUSH_REGISTRY_URL;

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_PUSH_REGISTRY_URL = 'https://registry.test/';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(''),
    }) as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_PUSH_REGISTRY_URL = ORIGINAL_ENV;
  });

  it('posts the subscription payload to the trimmed registry url', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRegisterPushSubscription(), { wrapper });

    result.current.mutate({
      did: 'did:plc:abc',
      expoPushToken: 'expo-token',
      platform: 'ios',
      devicePushToken: 'device-token',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith('https://registry.test/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        did: 'did:plc:abc',
        expoPushToken: 'expo-token',
        devicePushToken: 'device-token',
        platform: 'ios',
      }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['notifications', 'preferences', 'did:plc:abc', undefined],
    });
  });

  it('throws when the registry url is not configured', async () => {
    delete process.env.EXPO_PUBLIC_PUSH_REGISTRY_URL;
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRegisterPushSubscription(), { wrapper });

    result.current.mutate({ did: 'did', expoPushToken: 'expo-token', platform: 'ios' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when the registry responds with a non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: jest.fn().mockResolvedValue('boom'),
    }) as unknown as typeof fetch;

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRegisterPushSubscription(), { wrapper });

    result.current.mutate({ did: 'did', expoPushToken: 'expo-token', platform: 'android' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toContain('500');
  });
});
