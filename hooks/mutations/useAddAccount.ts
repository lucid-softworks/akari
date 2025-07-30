import { Account } from "@/types/account";
import { storage } from "@/utils/secureStorage";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Mutation hook for adding an account
 */
export function useAddAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<Account, "id" | "createdAt">) => {
      const newAccount: Account = {
        ...account,
        id: `${account.handle}-${Date.now()}`,
        createdAt: Date.now(),
      };
      return newAccount;
    },
    onSuccess: async (newAccount) => {
      queryClient.setQueryData(["accounts"], (old: Account[] = []) => [
        ...old,
        newAccount,
      ]);

      // Manually persist the updated accounts query
      const oldAccounts = storage.getItem<Account[]>("accounts") ?? [];
      storage.setItem("accounts", [...oldAccounts, newAccount]);
    },
  });
}
