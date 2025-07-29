import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Query hook for Bluesky authentication status and management
 * Validates stored tokens and provides logout functionality
 */
export function useBlueskyAuth() {
  const queryClient = useQueryClient();

  // Get current user data for query key
  const currentUser = jwtStorage.getUserData();
  const currentUserDid = currentUser?.did;

  const authQuery = useQuery({
    queryKey: ["blueskyAuth", currentUserDid],
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

  const logout = () => {
    jwtStorage.clearAuth();
    // Invalidate all auth-related queries
    queryClient.invalidateQueries({ queryKey: ["blueskyAuth"] });
    queryClient.invalidateQueries({ queryKey: ["auth"] });
  };

  const checkAuthStatus = () => {
    queryClient.invalidateQueries({
      queryKey: ["blueskyAuth", currentUserDid],
    });
  };

  return {
    isAuthenticated: authQuery.data?.isAuthenticated ?? false,
    isLoading: authQuery.isLoading,
    user: authQuery.data?.user,
    logout,
    checkAuthStatus,
  };
}
