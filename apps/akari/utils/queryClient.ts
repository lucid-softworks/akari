import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { installAuthRefreshHandler } from './authRefreshHandler';

export const REACT_QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
export const REACT_QUERY_CACHE_BUSTER = 'akari@1';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: REACT_QUERY_CACHE_MAX_AGE,
      retry: 2,
    },
    dehydrate: {
      shouldDehydrateQuery: (query) => {
        // Never persist pending queries -- they cause hundreds of
        // "Uncaught (in promise) Error: redacted" on next hydration
        // because the original fetch promise is gone.
        return query.state.status === 'success';
      },
    },
  },
});

// React Query has no event source for app foreground / background on RN by
// default, so `refetchOnWindowFocus` is dead until we wire `AppState` in.
// Without this the user backgrounds the app for longer than the access
// token's life (~2 hours), the 60-second `refetchInterval` in
// `useAuthStatus` pauses, and the first XRPC call after foregrounding
// reaches the PDS with a dead token before the next poll tick gets a
// chance to refresh — surfacing as the "please sign in again" toast even
// though the refresh token is still good.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener(
      'change',
      (status: AppStateStatus) => {
        handleFocus(status === 'active');
      },
    );
    return () => subscription.remove();
  });
}

installAuthRefreshHandler(queryClient);
