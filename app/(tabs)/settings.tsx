import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/queries/useAuthStatus";
import { useProfile } from "@/hooks/queries/useProfile";
import { useBorderColor } from "@/hooks/useBorderColor";
import {
  jwtStorage,
  secureStorageUtils,
  type Account,
} from "@/utils/secureStorage";

export default function SettingsScreen() {
  const { data: authData, isLoading } = useAuthStatus();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accountProfiles, setAccountProfiles] = useState<Record<string, any>>(
    {}
  );

  // Get current account profile data
  const { data: currentProfile } = useProfile(
    currentAccount?.handle || "",
    !!currentAccount?.handle
  );

  // Handle navigation in useEffect to avoid React warnings
  useEffect(() => {
    if (!isLoading && !authData?.isAuthenticated) {
      router.replace("/(auth)/signin");
    }
  }, [authData?.isAuthenticated, isLoading]);

  // Load accounts on mount
  useEffect(() => {
    if (authData?.isAuthenticated) {
      let allAccounts = jwtStorage.getAllAccounts();
      let current = jwtStorage.getCurrentAccount();

      // If no accounts exist but user is authenticated, migrate from old system
      if (allAccounts.length === 0 && jwtStorage.isAuthenticated()) {
        const oldUserData = jwtStorage.getUserData();
        const oldToken = jwtStorage.getToken();
        const oldRefreshToken = jwtStorage.getRefreshToken();

        if (oldUserData.handle && oldToken) {
          // Migrate to multi-account system
          const accountId = jwtStorage.addAccount({
            did: oldUserData.did || "",
            handle: oldUserData.handle,
            jwtToken: oldToken,
            refreshToken: oldRefreshToken || "",
          });

          // Reload accounts after migration
          allAccounts = jwtStorage.getAllAccounts();
          current = jwtStorage.getCurrentAccount();
        }
      }

      console.log("Settings: Found accounts:", allAccounts.length);
      console.log("Settings: Current account:", current?.handle);

      setAccounts(allAccounts);
      setCurrentAccount(current);
    }
  }, [authData?.isAuthenticated]);

  // Update current account profile data
  useEffect(() => {
    if (currentAccount && currentProfile) {
      setAccountProfiles((prev) => ({
        ...prev,
        [currentAccount.id]: currentProfile,
      }));
    }
  }, [currentAccount, currentProfile]);

  // Fetch profile data for each account to get avatars
  useEffect(() => {
    if (accounts.length > 0) {
      const fetchProfiles = async () => {
        const profiles: Record<string, any> = {};

        for (const account of accounts) {
          try {
            // Skip current account as it's handled by the profile hook
            if (account.id === currentAccount?.id) {
              continue;
            }

            // For other accounts, fetch profile data directly
            const response = await fetch(
              `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${account.handle}`,
              {
                headers: {
                  Authorization: `Bearer ${account.jwtToken}`,
                },
              }
            );

            if (response.ok) {
              const profile = await response.json();
              if (profile.data) {
                profiles[account.id] = profile.data;
              }
            }
          } catch (error) {
            console.error(
              `Error fetching profile for ${account.handle}:`,
              error
            );
          }
        }

        setAccountProfiles((prev) => ({ ...prev, ...profiles }));
      };

      fetchProfiles();
    }
  }, [accounts, currentAccount]);

  const handleLogout = () => {
    Alert.alert(
      "Disconnect All Accounts",
      "Are you sure you want to disconnect all Bluesky accounts? This will clear all stored data.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Disconnect All",
          style: "destructive",
          onPress: () => {
            // Clear all secure storage data
            secureStorageUtils.clear();
            router.replace("/(auth)/signin");
          },
        },
      ]
    );
  };

  const handleSwitchAccount = (account: Account) => {
    if (account.id === currentAccount?.id) return;

    Alert.alert("Switch Account", `Switch to @${account.handle}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Switch",
        onPress: () => {
          jwtStorage.switchAccount(account.id);
          setCurrentAccount(account);
          // Stay on settings page and refresh the data
          setAccounts(jwtStorage.getAllAccounts());
        },
      },
    ]);
  };

  const handleRemoveAccount = (account: Account) => {
    if (accounts.length === 1) {
      Alert.alert(
        "Cannot Remove Account",
        "You must have at least one account. Please add another account first.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Remove Account",
      `Are you sure you want to remove @${account.handle}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            jwtStorage.removeAccount(account.id);
            const updatedAccounts = jwtStorage.getAllAccounts();
            const updatedCurrent = jwtStorage.getCurrentAccount();
            setAccounts(updatedAccounts);
            setCurrentAccount(updatedCurrent);

            if (account.id === currentAccount?.id) {
              // If we removed the current account, reload the app
              router.replace("/(tabs)");
            }
          },
        },
      ]
    );
  };

  const handleAddAccount = () => {
    // Navigate to sign in with option to add account
    router.push("/(auth)/signin?addAccount=true");
  };

  // Don't render anything if not authenticated or still loading
  if (isLoading || !authData?.isAuthenticated) {
    return null;
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        </ThemedView>

        {/* Accounts Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Accounts ({accounts.length})
          </ThemedText>

          {accounts.length === 0 && (
            <ThemedView style={styles.settingItem}>
              <ThemedText style={styles.settingValue}>
                No accounts found
              </ThemedText>
            </ThemedView>
          )}

          {accounts.map((account) => {
            const profile = accountProfiles[account.id];
            const avatar = profile?.avatar || account.avatar;
            const displayName = profile?.displayName || account.displayName;

            return (
              <ThemedView
                key={account.id}
                style={[styles.settingItem, { borderBottomColor: borderColor }]}
              >
                <ThemedView style={styles.accountInfo}>
                  <ThemedView style={styles.accountAvatarContainer}>
                    {avatar ? (
                      <ThemedView style={styles.accountAvatar}>
                        <Image
                          source={{ uri: avatar }}
                          style={styles.accountAvatarImage}
                          contentFit="cover"
                        />
                      </ThemedView>
                    ) : (
                      <ThemedView style={styles.accountAvatarFallback}>
                        <ThemedText style={styles.accountAvatarFallbackText}>
                          {(displayName ||
                            account.handle ||
                            "U")[0].toUpperCase()}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>

                  <ThemedView style={styles.accountDetails}>
                    <ThemedText style={styles.accountHandle}>
                      @{account.handle}
                    </ThemedText>
                    {displayName && (
                      <ThemedText style={styles.accountDisplayName}>
                        {displayName}
                      </ThemedText>
                    )}
                    {account.id === currentAccount?.id && (
                      <ThemedText style={styles.currentAccountBadge}>
                        Current
                      </ThemedText>
                    )}
                  </ThemedView>

                  <ThemedView style={styles.accountActions}>
                    {account.id !== currentAccount?.id && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleSwitchAccount(account)}
                      >
                        <ThemedText style={styles.actionButtonText}>
                          Switch
                        </ThemedText>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => handleRemoveAccount(account)}
                    >
                      <ThemedText style={styles.removeButtonText}>
                        Remove
                      </ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            );
          })}

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: borderColor }]}
            onPress={handleAddAccount}
          >
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>Add Account</ThemedText>
              <ThemedText style={styles.settingValue}>
                Connect another Bluesky account
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {/* Current Account Section */}
        {currentAccount && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Current Account</ThemedText>

            <ThemedView style={styles.settingItem}>
              <ThemedView style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Handle</ThemedText>
                <ThemedText style={styles.settingValue}>
                  @{currentAccount.handle}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.settingItem}>
              <ThemedView style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>DID</ThemedText>
                <ThemedText style={styles.settingValue}>
                  {currentAccount.did}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        )}

        {/* Actions Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Actions</ThemedText>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: borderColor }]}
            onPress={handleLogout}
          >
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>
                Disconnect All Accounts
              </ThemedText>
              <ThemedText style={styles.settingValue}>
                Remove all Bluesky connections
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {/* About Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>

          <ThemedView style={styles.settingItem}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>Version</ThemedText>
              <ThemedText style={styles.settingValue}>1.0.0</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Account for tab bar
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.8,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  settingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 16,
    opacity: 0.7,
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountAvatarContainer: {
    width: 40,
    height: 40,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  accountAvatarImage: {
    width: 40,
    height: 40,
  },
  accountAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatarFallbackText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  accountDetails: {
    flex: 1,
    gap: 4,
  },
  accountHandle: {
    fontSize: 16,
    fontWeight: "500",
  },
  accountDisplayName: {
    fontSize: 14,
    opacity: 0.7,
  },
  currentAccountBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 4,
  },
  accountActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  removeButton: {
    backgroundColor: "#dc3545",
  },
  removeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
