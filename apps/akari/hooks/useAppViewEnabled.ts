import { useAppViewSettings } from '@/hooks/useAppViewSettings';
import { isAppViewEnabled } from '@/utils/appView';

/**
 * Convenience selector over `useAppViewSettings` that returns just the
 * resolved `appViewEnabled` boolean. Use this in screens that need to
 * branch between "AppView path" and "microcosm-only path" without caring
 * about which AppView is selected.
 */
export function useAppViewEnabled(): boolean {
  const { config } = useAppViewSettings();
  return isAppViewEnabled(config);
}
