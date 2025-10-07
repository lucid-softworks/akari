import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

export type ActivityPeriod = 'day' | 'week' | 'month' | 'year' | 'forever';

export type ActivityInsightPoint = {
  dateKey: string;
  notes: number;
  followers: number;
};

export type ActivityInsights = {
  points: ActivityInsightPoint[];
  totalNotes: number;
  newFollowers: number;
  totalFollowers: number;
};

function generateMockActivity(period: ActivityPeriod): ActivityInsights {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const periodLengthByKey: Record<ActivityPeriod, number> = {
    day: 1,
    week: 7,
    month: 30,
    year: 365,
    forever: 730,
  };

  const totalDays = periodLengthByKey[period];
  const points: ActivityInsightPoint[] = [];

  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(day.getDate() - index);

    const dateKey = day.toISOString().split('T')[0];
    const baseNotes = 6 + ((index * 3) % 11);
    const baseFollowers = 1 + ((index * 2) % 5);

    points.push({
      dateKey,
      notes: baseNotes,
      followers: baseFollowers,
    });
  }

  const totalNotes = points.reduce((sum, point) => sum + point.notes, 0);
  const newFollowers = points.reduce((sum, point) => sum + point.followers, 0);
  const totalFollowers = 2400 + newFollowers;

  return { points, totalNotes, newFollowers, totalFollowers };
}

async function mockFetchActivity(period: ActivityPeriod): Promise<ActivityInsights> {
  const result = generateMockActivity(period);
  await new Promise((resolve) => {
    setTimeout(resolve, 120);
  });
  return result;
}

export function useActivityInsights(period: ActivityPeriod) {
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['activityInsights', currentAccount?.did, period],
    queryFn: () => mockFetchActivity(period),
    enabled: Boolean(currentAccount?.did),
    staleTime: 5 * 60 * 1000,
  });
}
