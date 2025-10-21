import { NotificationData } from '@/app/(tabs)/activity';
import { useQuery } from '@tanstack/react-query';
import { useNotifications } from './useNotifications';

export type ActivityChartData = {
  timestamp: string;
  value: number;
};

export type ActivityStats = {
  notes: number | string;
  newFollowers: number | string;
};

export type ActivityChartResponse = {
  chartData: ActivityChartData[];
  stats: ActivityStats;
  biggestFans: {
    handle: string;
    displayName: string;
    avatar: string;
  }[];
  topPost: {
    uri: string;
    content: string;
    image?: string;
    notes: number;
    author?: {
      handle: string;
      displayName: string;
      avatar: string;
    };
  } | null;
};

export type Timeframe = '1d' | '3d' | '7d' | '30d';

// Simple seeded random number generator for consistent data
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Mock data generator
const generateMockChartData = (
  timeframe: Timeframe = '3d',
  metric: 'notes' | 'followers' | 'base' = 'notes',
): ActivityChartData[] => {
  const data: ActivityChartData[] = [];
  const now = new Date();

  // Determine number of data points based on timeframe
  const hoursPerPoint = timeframe === '1d' ? 1 : timeframe === '3d' ? 6 : timeframe === '7d' ? 12 : 24;
  const totalHours = timeframe === '1d' ? 24 : timeframe === '3d' ? 72 : timeframe === '7d' ? 168 : 720;
  const numPoints = Math.floor(totalHours / hoursPerPoint);

  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * hoursPerPoint * 60 * 60 * 1000);

    // Create a seed based on timeframe and timestamp only (not metric)
    const seed = `${timeframe}-${timestamp.getTime()}`.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    // Generate base value that's the same regardless of metric
    let value = 0;
    const hour = timestamp.getHours();

    // Generate base activity pattern that scales with timeframe
    // Longer periods should have higher cumulative values

    // Scale factor based on timeframe (longer periods = higher values)
    const scaleFactor = timeframe === '1d' ? 1 : timeframe === '3d' ? 3 : timeframe === '7d' ? 7 : 30;

    // Generate base positive activity
    if (hour >= 9 && hour <= 17) {
      value += seededRandom(seed + 3) * 30 * scaleFactor + 20 * scaleFactor;
    } else if (hour >= 18 && hour <= 22) {
      value += seededRandom(seed + 4) * 40 * scaleFactor + 30 * scaleFactor;
    } else {
      value += seededRandom(seed + 5) * 15 * scaleFactor + 5 * scaleFactor;
    }

    // Random spikes for viral content
    if (seededRandom(seed + 6) < 0.1) {
      value += seededRandom(seed + 7) * 20 * scaleFactor;
    }

    // Individual data points can be negative for followers (unfollows) but not for notes
    // This is based on individual points, not the overall period
    if (metric === 'followers' && seededRandom(seed + 8) < 0.4) {
      // 40% chance this individual point is negative for followers only
      // Negative values can be quite deep and don't scale with timeframe
      const negativeValue = -(seededRandom(seed + 9) * 50 + 10); // -10 to -60
      value = negativeValue; // Replace positive value with negative
    }

    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(value), // Ensure whole numbers only
    });
  }

  return data;
};

const generateMockBiggestFans = (notifications: NotificationData[]) => {
  // Group notifications by author and count interactions
  const authorStats = new Map();

  notifications.forEach((notification) => {
    const author = notification.author;
    const key = author.did;

    if (!authorStats.has(key)) {
      authorStats.set(key, {
        handle: author.handle,
        displayName: author.displayName,
        avatar: author.avatar,
        interactionCount: 0,
      });
    }

    // Count different types of interactions
    if (notification.reason === 'like' || notification.reason === 'repost' || notification.reason === 'reply') {
      authorStats.get(key).interactionCount += 1;
    }
  });

  // Convert to array and sort by interaction count
  const sortedAuthors = Array.from(authorStats.values())
    .sort((a, b) => b.interactionCount - a.interactionCount)
    .slice(0, 4);

  // Convert to biggest fans format
  return sortedAuthors.map((author) => ({
    handle: author.handle,
    displayName: author.displayName,
    avatar: author.avatar,
  }));
};

const generateMockTopPost = (
  notifications: NotificationData[],
): {
  uri: string;
  content: string;
  image?: string;
  notes: number;
  author?: {
    handle: string;
    displayName: string;
    avatar: string;
  };
} | null => {
  // Just find any notification that has post content
  const postNotification = notifications.find((notification) => notification.postContent || notification.embed);

  if (postNotification) {
    return {
      uri: postNotification.reasonSubject || postNotification.id,
      content: postNotification.postContent || '',
      image: postNotification.embed?.images?.[0]?.thumb,
      notes: 1, // Just show 1 since it's any post
      author: {
        handle: postNotification.author.handle,
        displayName: postNotification.author.displayName,
        avatar: postNotification.author.avatar,
      },
    };
  }

  return null;
};

const fetchActivityChart = async (
  timeframe: Timeframe = '3d',
  metric: 'notes' | 'followers' = 'notes',
  notifications?: NotificationData[],
): Promise<ActivityChartResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 30d timeframe has no data yet
  if (timeframe === '30d') {
    return {
      chartData: [],
      stats: {
        notes: '-',
        newFollowers: '-',
      },
      biggestFans: notifications && notifications.length > 0 ? generateMockBiggestFans(notifications) : [],
      topPost: notifications && notifications.length > 0 ? generateMockTopPost(notifications) : null,
    };
  }

  // Generate base data once per timeframe for consistent stats
  const baseData = generateMockChartData(timeframe, 'base');

  // Generate chart data with different scaling and negative logic
  const notesData = baseData.map((point) => ({
    ...point,
    value: Math.round(point.value * 1), // Notes scale = 1, no negatives
  }));

  const followersData = baseData.map((point) => {
    let value = Math.round(point.value * 0.1); // Followers scale = 0.1

    // Apply negative logic to followers only
    const seed = `${timeframe}-${point.timestamp}`.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    if (seededRandom(seed + 8) < 0.4) {
      // 40% chance this individual point is negative for followers
      const negativeValue = -(seededRandom(seed + 9) * 50 + 10); // -10 to -60
      value = Math.round(negativeValue * 0.1); // Scale negative values too
    }

    return {
      ...point,
      value,
    };
  });

  // Calculate stats from base data for consistency
  const notesTotal = baseData.reduce((sum, point) => sum + point.value, 0);
  const followersTotal = Math.round(notesTotal * 0.1);

  const stats: ActivityStats = {
    notes: notesTotal,
    newFollowers: followersTotal,
  };

  // Return the appropriate chart data based on metric
  const chartData = metric === 'notes' ? notesData : followersData;

  return {
    chartData,
    stats,
    biggestFans: notifications && notifications.length > 0 ? generateMockBiggestFans(notifications) : [],
    topPost: notifications && notifications.length > 0 ? generateMockTopPost(notifications) : null,
  };
};

export const useActivityChart = (timeframe: Timeframe = '3d', metric: 'notes' | 'followers' = 'notes') => {
  // Get notifications data to use for biggest fans and top post
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications(50, undefined, undefined, true);

  // Flatten all notifications from all pages
  const allNotifications = notificationsData?.pages?.flatMap((page) => page.notifications) || [];

  return useQuery({
    queryKey: ['activity', timeframe, metric, allNotifications.length], // Include notifications count in query key
    queryFn: () => fetchActivityChart(timeframe, metric, allNotifications),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !notificationsLoading && allNotifications.length > 0, // Wait for notifications to load and have data
  });
};
