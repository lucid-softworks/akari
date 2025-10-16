# @akari/devtools-current-route

A lightweight Expo DevTools plugin that surfaces the active Expo Router pathname from the Akari app. The plugin ships with a web UI and a hook that the app calls to synchronise route changes back to DevTools.

## Available scripts

- `npm run web:dev` — starts the plugin web UI with `expo start --web` for rapid development.
- `npm run web:export` — builds the DevTools web UI into `dist/` so Expo CLI can load the panel locally. This runs automatically
  from the package `prepare` script after dependencies install.

## Hook usage

Import `useCurrentRouteDevToolsPlugin` inside the app to broadcast path updates:

```tsx
import { usePathname } from 'expo-router';
import { useCurrentRouteDevToolsPlugin } from '@akari/devtools-current-route';

function CurrentRouteBridge() {
  const pathname = usePathname();

  useCurrentRouteDevToolsPlugin(pathname ?? null);

  return null;
}
```

The hook is a no-op in production builds, so it is safe to run unconditionally.
