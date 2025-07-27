import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/queries/useAuthStatus";
import { useBorderColor } from "@/hooks/useBorderColor";
import { jwtStorage } from "@/utils/secureStorage";

export default function SettingsScreen() {
  const { data: authData, isLoading } = useAuthStatus();
  const userData = jwtStorage.getUserData();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();

  // Handle navigation in useEffect to avoid React warnings
  useEffect(() => {
    if (!isLoading && !authData?.isAuthenticated) {
      router.replace("/(auth)/signin");
    }
  }, [authData?.isAuthenticated, isLoading]);

  const handleLogout = () => {
    Alert.alert(
      "Disconnect Bluesky",
      "Are you sure you want to disconnect your Bluesky account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            jwtStorage.clearAuth();
            router.replace("/(auth)/signin");
          },
        },
      ]
    );
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

        {/* Account Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>

          <ThemedView style={styles.settingItem}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>Handle</ThemedText>
              <ThemedText style={styles.settingValue}>
                @{userData.handle}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.settingItem}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>DID</ThemedText>
              <ThemedText style={styles.settingValue}>
                {userData.did}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Actions Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Actions</ThemedText>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: borderColor }]}
            onPress={handleLogout}
          >
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>
                Disconnect Account
              </ThemedText>
              <ThemedText style={styles.settingValue}>
                Remove Bluesky connection
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
    paddingVertical: 20,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
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
});
