import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { useEffect, useState } from "react";

export function useBlueskyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = jwtStorage.getToken();
      const refreshToken = jwtStorage.getRefreshToken();

      if (!token || !refreshToken) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Try to refresh the session to validate tokens
      try {
        const session = await blueskyApi.refreshSession(refreshToken);

        // Update stored tokens with fresh ones
        jwtStorage.setToken(session.accessJwt);
        jwtStorage.setRefreshToken(session.refreshJwt);
        jwtStorage.setUserData(session.did, session.handle);

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Clear invalid tokens
        jwtStorage.clearAuth();
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    jwtStorage.clearAuth();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    logout,
    checkAuthStatus,
  };
}
