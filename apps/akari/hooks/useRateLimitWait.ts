import { useEffect, useMemo, useState } from 'react';

import { getRateLimitCooldownUntil } from '@/bluesky-api';

/**
 * Polls the bluesky-api client's rate-limit cooldown for the given PDS
 * once a second and returns the remaining wait in milliseconds (0 when
 * the client is not rate-limited). Returns 0 if no PDS is supplied.
 */
export function useRateLimitWait(pdsUrl: string | undefined): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pdsUrl) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [pdsUrl]);

  return useMemo(() => {
    if (!pdsUrl) return 0;
    const until = getRateLimitCooldownUntil(pdsUrl);
    if (!until) return 0;
    return Math.max(0, until - Date.now());
    // `tick` participates so the memo recomputes each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdsUrl, tick]);
}
