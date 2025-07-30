/**
 * Formats a timestamp as a relative time string using Intl.RelativeTimeFormat
 * @param timestamp - ISO string or Date object
 * @param locale - Locale string (defaults to 'en')
 * @returns Localized relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: string | Date, locale: string = 'en'): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInDays > 0) {
    return rtf.format(-diffInDays, 'day');
  } else if (diffInHours > 0) {
    return rtf.format(-diffInHours, 'hour');
  } else if (diffInMinutes > 0) {
    return rtf.format(-diffInMinutes, 'minute');
  } else {
    return rtf.format(-diffInSeconds, 'second');
  }
}
