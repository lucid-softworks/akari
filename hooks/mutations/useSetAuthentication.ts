import { storage } from "@/utils/secureStorage";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for setting all authentication data at once
 */
export function useSetAuthentication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      refreshToken,
      did,
      handle,
    }: {
      token: string;
      refreshToken: string;
      did: string;
      handle: string;
    }) => {
      return { token, refreshToken, did, handle };
    },
    onSuccess: async ({ token, refreshToken, did, handle }) => {
      queryClient.setQueryData(["jwtToken"], token);
      queryClient.setQueryData(["refreshToken"], refreshToken);

      // Create and set the current account
      const currentAccount = {
        did,
        handle,
        jwtToken: token,
        refreshToken,
      };
      queryClient.setQueryData(["currentAccount"], currentAccount);

      // Manually persist the updated queries
      storage.setItem("jwtToken", token);
      storage.setItem("refreshToken", refreshToken);
      storage.setItem("currentAccount", currentAccount);
    },
  });
}
