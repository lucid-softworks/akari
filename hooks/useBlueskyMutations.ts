import {
  blueskyApi,
  BlueskyApi,
  type BlueskySession,
} from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for signing in to Bluesky
 * Handles authentication and stores tokens securely
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      identifier,
      password,
      pdsUrl,
    }: {
      /** User's handle or email address */
      identifier: string;
      /** App password from Bluesky settings */
      password: string;
      /** Optional custom PDS URL (defaults to bsky.social) */
      pdsUrl?: string;
    }) => {
      const api = pdsUrl ? BlueskyApi.createWithPDS(pdsUrl) : blueskyApi;
      return await api.createSession(identifier, password);
    },
    onSuccess: (session: BlueskySession) => {
      // Store tokens securely
      jwtStorage.setToken(session.accessJwt);
      jwtStorage.setRefreshToken(session.refreshJwt);
      jwtStorage.setUserData(session.did, session.handle);

      // Invalidate and refetch auth-related queries
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Mutation hook for refreshing the Bluesky session
 * Used to renew expired access tokens
 */
export function useRefreshSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      refreshToken,
      pdsUrl,
    }: {
      /** The refresh JWT token */
      refreshToken: string;
      /** Optional custom PDS URL (defaults to bsky.social) */
      pdsUrl?: string;
    }) => {
      const api = pdsUrl ? BlueskyApi.createWithPDS(pdsUrl) : blueskyApi;
      return await api.refreshSession(refreshToken);
    },
    onSuccess: (session: BlueskySession) => {
      // Update stored tokens
      jwtStorage.setToken(session.accessJwt);
      jwtStorage.setRefreshToken(session.refreshJwt);
      jwtStorage.setUserData(session.did, session.handle);

      // Invalidate auth queries
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

/**
 * Query hook for fetching a user's profile information
 * @param did - The user's Decentralized Identifier (DID)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useProfile(did: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["profile", did],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getProfile(token, did);
    },
    enabled: enabled && !!did,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query hook for fetching the user's timeline feed
 * @param limit - Number of posts to fetch (default: 20)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useTimeline(limit: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: ["timeline", limit],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getTimeline(token, limit);
    },
    enabled: enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Query hook for checking authentication status
 * Validates stored tokens and returns current auth state
 */
export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth"],
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
      } catch (error) {
        // Clear invalid tokens
        jwtStorage.clearAuth();
        return { isAuthenticated: false };
      }
    },
    staleTime: 0, // Always check auth status
    retry: false,
  });
}
