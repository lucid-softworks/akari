import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet } from "react-native";

import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/queries/useAuthStatus";
import { jwtStorage } from "@/utils/secureStorage";

export default function ProfileScreen() {
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
          Profile
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your Bluesky account information
        </ThemedText>
      </ThemedView>

      <ThemedCard style={styles.userInfo}>
        <ThemedText type="subtitle">Bluesky Account</ThemedText>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>Handle:</ThemedText>
          <ThemedText
            style={styles.value}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userData.handle}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>DID:</ThemedText>
          <ThemedText
            style={styles.value}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userData.did}
          </ThemedText>
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  userInfo: {
    gap: 20,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
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
