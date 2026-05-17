import { useEffect, useReducer } from 'react';

import { fetchFavicon, getDomainFromUrl } from '@/utils/faviconUtils';

type FaviconState = {
  faviconUrl: string | null;
  // oxlint-disable-next-line react-doctor/rendering-usetransition-loading -- isLoading guards a real async fetch (fetchFavicon), not a state transition; useTransition does not apply
  isLoading: boolean;
};

type FaviconAction =
  | { type: 'idle' }
  | { type: 'start' }
  | { type: 'success'; faviconUrl: string | null }
  | { type: 'failure' };

const IDLE_STATE: FaviconState = { faviconUrl: null, isLoading: false };

function reduce(state: FaviconState, action: FaviconAction): FaviconState {
  switch (action.type) {
    case 'idle':
      return IDLE_STATE;
    case 'start':
      return { faviconUrl: null, isLoading: true };
    case 'success':
      return { faviconUrl: action.faviconUrl, isLoading: false };
    case 'failure':
      return { faviconUrl: null, isLoading: false };
  }
}

/**
 * Hook to fetch and cache favicons for URLs
 */
export function useFavicon(url: string, emoji?: string) {
  const [state, dispatch] = useReducer(reduce, IDLE_STATE);

  useEffect(() => {
    // If emoji is provided, don't fetch favicon
    if (emoji && emoji.trim()) {
      dispatch({ type: 'idle' });
      return;
    }

    // Only fetch favicon if no emoji is provided
    if (!url) {
      dispatch({ type: 'idle' });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'start' });
    fetchFavicon(url)
      .then((favicon) => {
        if (cancelled) return undefined;
        dispatch({ type: 'success', faviconUrl: favicon });
        return undefined;
      })
      .catch((error) => {
        if (cancelled) return;
        if (__DEV__) {
          console.warn('Failed to load favicon for', url, error);
        }
        dispatch({ type: 'failure' });
      });

    return () => {
      cancelled = true;
    };
  }, [url, emoji]);

  return {
    faviconUrl: state.faviconUrl,
    isLoading: state.isLoading,
    domain: getDomainFromUrl(url),
  };
}
