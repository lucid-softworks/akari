import { useEffect, useState } from 'react';

import { fetchFavicon, getDomainFromUrl } from '@/utils/faviconUtils';

/**
 * Hook to fetch and cache favicons for URLs
 */
export function useFavicon(url: string, emoji?: string) {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If emoji is provided, don't fetch favicon
    if (emoji && emoji.trim()) {
      setFaviconUrl(null);
      return;
    }

    // Only fetch favicon if no emoji is provided
    if (!url) {
      setFaviconUrl(null);
      return;
    }

    const loadFavicon = async () => {
      setIsLoading(true);
      try {
        const favicon = await fetchFavicon(url);
        setFaviconUrl(favicon);
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to load favicon for', url, error);
        }
        setFaviconUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavicon();
  }, [url, emoji]);

  return {
    faviconUrl,
    isLoading,
    domain: getDomainFromUrl(url),
  };
}
