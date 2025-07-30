import { useClearAuthentication } from "@/hooks/mutations/useClearAuthentication";
import { useSetAuthentication } from "@/hooks/mutations/useSetAuthentication";
import { blueskyApi } from "@/utils/blueskyApi";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "./useCurrentAccount";
import { useJwtToken } from "./useJwtToken";
import { useRefreshToken } from "./useRefreshToken";

/**
 * Query hook for checking authentication status
 * Validates stored tokens and returns current auth state
 */
export function useAuthStatus() {
  const { data: token } = useJwtToken();
  const { data: refreshToken } = useRefreshToken();
  const { data: currentAccount } = useCurrentAccount();
  const setAuthMutation = useSetAuthentication();
  const clearAuthMutation = useClearAuthentication();

  const currentUserDid = currentAccount?.did || null;

  return useQuery({
    queryKey: ["auth", currentUserDid],
    queryFn: async () => {
      if (!token || !refreshToken) {
        return { isAuthenticated: false };
      }

      try {
        // Try to refresh the session to validate tokens
        const session = await blueskyApi.refreshSession(refreshToken);

        // Update stored tokens with fresh ones
        setAuthMutation.mutate({
          token: session.accessJwt,
          refreshToken: session.refreshJwt,
          did: session.did,
          handle: session.handle,
        });

        return {
          isAuthenticated: true,
          user: {
            did: session.did,
            handle: session.handle,
            email: session.email,
            active: session.active,
            status: session.active === false ? session.status : undefined,
          },
        };
      } catch {
        // Clear invalid tokens
        clearAuthMutation.mutate();
        return { isAuthenticated: false };
      }
    },
    staleTime: 0, // Always check auth status
    retry: false,
  });
}
