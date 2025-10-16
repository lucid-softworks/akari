export type { CurrentRouteDevToolsPayload } from './useCurrentRouteDevToolsPlugin';

export let useCurrentRouteDevToolsPlugin: typeof import('./useCurrentRouteDevToolsPlugin').useCurrentRouteDevToolsPlugin;

// @ts-ignore process.env.NODE_ENV is injected by Expo Metro
if (process.env.NODE_ENV !== 'production') {
  useCurrentRouteDevToolsPlugin = require('./useCurrentRouteDevToolsPlugin').useCurrentRouteDevToolsPlugin;
} else {
  useCurrentRouteDevToolsPlugin = () => {};
}
