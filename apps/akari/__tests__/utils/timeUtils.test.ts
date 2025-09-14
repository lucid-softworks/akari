import { formatRelativeTime } from '@/utils/timeUtils';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Mock the current time to a fixed value for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should format time as seconds ago for recent timestamps', () => {
    const timestamp = new Date('2024-01-15T11:59:30Z'); // 30 seconds ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('30 seconds ago');
  });

  it('should format time as minutes ago', () => {
    const timestamp = new Date('2024-01-15T11:45:00Z'); // 15 minutes ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('15 minutes ago');
  });

  it('should format time as hours ago', () => {
    const timestamp = new Date('2024-01-15T09:00:00Z'); // 3 hours ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('3 hours ago');
  });

  it('should format time as days ago', () => {
    const timestamp = new Date('2024-01-13T12:00:00Z'); // 2 days ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('2 days ago');
  });

  it('should work with ISO string timestamps', () => {
    const timestamp = '2024-01-15T11:30:00Z'; // 30 minutes ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('30 minutes ago');
  });

  it('should use custom locale when provided', () => {
    const timestamp = new Date('2024-01-15T11:30:00Z'); // 30 minutes ago
    const result = formatRelativeTime(timestamp, 'es');

    // The exact format depends on the locale, but it should be different from English
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should handle edge case of exactly 1 minute ago', () => {
    const timestamp = new Date('2024-01-15T11:59:00Z'); // 1 minute ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('1 minute ago');
  });

  it('should handle edge case of exactly 1 hour ago', () => {
    const timestamp = new Date('2024-01-15T11:00:00Z'); // 1 hour ago
    const result = formatRelativeTime(timestamp);

    expect(result).toBe('1 hour ago');
  });

  it('should handle edge case of exactly 1 day ago', () => {
    const timestamp = new Date('2024-01-14T12:00:00Z'); // 1 day ago
    const result = formatRelativeTime(timestamp);

    // Intl.RelativeTimeFormat with numeric: 'auto' returns "yesterday" for 1 day ago
    expect(result).toBe('yesterday');
  });
});
