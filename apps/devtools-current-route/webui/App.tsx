import { useDevToolsPluginClient, type EventSubscription } from 'expo/devtools';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PLUGIN_IDENTIFIER = 'akari-current-route';
const ROUTE_UPDATE_EVENT = 'current-route:update';
const ROUTE_REQUEST_EVENT = 'current-route:request';

type RouteUpdatePayload = {
  pathname: string | null;
};

export default function App() {
  const client = useDevToolsPluginClient(PLUGIN_IDENTIFIER);
  const [pathname, setPathname] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return undefined;
    }

    const subscriptions: EventSubscription[] = [];

    subscriptions.push(
      client.addMessageListener(ROUTE_UPDATE_EVENT, (payload: RouteUpdatePayload) => {
        setPathname(payload.pathname ?? null);
      }),
    );

    client.sendMessage(ROUTE_REQUEST_EVENT, {});

    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, [client]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Current route</Text>
      <Text style={styles.path} accessibilityRole="text">
        {pathname ?? 'Waiting for device…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    backgroundColor: '#111827',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  path: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#f97316',
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
