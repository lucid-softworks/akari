import { useDevToolsPluginClient, type EventSubscription } from 'expo/devtools';
import { useEffect } from 'react';

const PLUGIN_IDENTIFIER = 'akari-current-route';
const ROUTE_UPDATE_EVENT = 'current-route:update';
const ROUTE_REQUEST_EVENT = 'current-route:request';

export type CurrentRouteDevToolsPayload = {
  pathname: string | null;
};

export function useCurrentRouteDevToolsPlugin(pathname: string | null) {
  const client = useDevToolsPluginClient(PLUGIN_IDENTIFIER);

  useEffect(() => {
    if (!client) {
      return;
    }

    client.sendMessage(ROUTE_UPDATE_EVENT, { pathname } satisfies CurrentRouteDevToolsPayload);
  }, [client, pathname]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const subscriptions: EventSubscription[] = [];

    subscriptions.push(
      client.addMessageListener(ROUTE_REQUEST_EVENT, () => {
        client.sendMessage(ROUTE_UPDATE_EVENT, { pathname } satisfies CurrentRouteDevToolsPayload);
      }),
    );

    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, [client, pathname]);
}
