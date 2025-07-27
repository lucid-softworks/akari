import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet } from "react-native";

import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/useBlueskyMutations";
import { jwtStorage } from "@/utils/secureStorage";

export default function HomeScreen() {
  const { data: authData, isLoading } = useAuthStatus();
  const userData = jwtStorage.getUserData();

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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Welcome to Akari
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Connected to Bluesky successfully
        </ThemedText>
      </ThemedView>

      <ThemedCard style={styles.userInfo}>
        <ThemedText type="subtitle">Bluesky Account</ThemedText>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>Handle:</ThemedText>
          <ThemedText style={styles.value}>{userData.handle}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>DID:</ThemedText>
          <ThemedText style={styles.value}>{userData.did}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>Status:</ThemedText>
          <ThemedText style={[styles.value, styles.authenticated]}>
            ✅ Connected to Bluesky
          </ThemedText>
        </ThemedView>
      </ThemedCard>

      <ThemedView style={styles.actions}>
        <ThemedView style={styles.button} onTouchEnd={handleLogout}>
          <ThemedText style={styles.buttonText}>Disconnect Bluesky</ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  userInfo: {
    gap: 16,
    marginBottom: 40,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
  },
  authenticated: {
    color: "green",
    fontWeight: "600",
  },
  actions: {
    gap: 16,
  },
  button: {
    backgroundColor: "#dc3545",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
