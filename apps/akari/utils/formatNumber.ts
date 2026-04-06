/**
 * Format a number in compact notation (1.2K, 15K, 1.2M, etc.)
 * Uses Intl.NumberFormat where available.
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return String(num);

  try {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(num);
  } catch {
    // Fallback for environments without Intl.NumberFormat compact support
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(num);
  }
}
