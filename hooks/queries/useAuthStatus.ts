import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useQuery } from "@tanstack/react-query";

/**
 * Query hook for checking authentication status
 * Validates stored tokens and returns current auth state
 */
export function useAuthStatus() {
  // Get current user data for query key
  const currentUser = jwtStorage.getUserData();
  const currentUserDid = currentUser?.did;

  return useQuery({
    queryKey: ["auth", currentUserDid],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      const refreshToken = jwtStorage.getRefreshToken();

      if (!token || !refreshToken) {
        return { isAuthenticated: false };
      }

      try {
        // Try to refresh the session to validate tokens
        const session = await blueskyApi.refreshSession(refreshToken);

        // Update stored tokens with fresh ones
        jwtStorage.setToken(session.accessJwt);
        jwtStorage.setRefreshToken(session.refreshJwt);
        jwtStorage.setUserData(session.did, session.handle);

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
        jwtStorage.clearAuth();
        return { isAuthenticated: false };
      }
    },
    staleTime: 0, // Always check auth status
    retry: false,
  });
}
