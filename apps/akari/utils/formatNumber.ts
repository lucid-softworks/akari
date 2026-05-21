const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

/** Format a number in compact notation (1.2K, 15K, 1.2M, etc.). */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return String(num);
  return compactNumberFormatter.format(num);
}
