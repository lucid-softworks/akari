/**
 * Utility functions for fetching and handling favicons
 */

/**
 * Extracts the domain from a URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Generates a favicon URL for a given domain
 * Uses Google's favicon service as a fallback
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Alternative favicon services for better coverage
 */
export function getAlternativeFaviconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/**
 * Fetches a favicon for a given URL
 * Returns the favicon URL or null if it fails
 */
export async function fetchFavicon(url: string): Promise<string | null> {
  try {
    const domain = getDomainFromUrl(url);

    // Try Google's favicon service first
    const faviconUrl = getFaviconUrl(domain);

    // Test if the favicon exists by making a HEAD request
    const response = await fetch(faviconUrl, { method: 'HEAD' });

    if (response.ok) {
      return faviconUrl;
    }

    // Fallback to DuckDuckGo's service
    const altFaviconUrl = getAlternativeFaviconUrl(domain);
    const altResponse = await fetch(altFaviconUrl, { method: 'HEAD' });

    if (altResponse.ok) {
      return altFaviconUrl;
    }

    return null;
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to fetch favicon for', url, error);
    }
    return null;
  }
}
