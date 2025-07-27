import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { jwtStorage } from "@/utils/secureStorage";

export default function HomeScreen() {
  const userData = jwtStorage.getUserData();
  const isAuthenticated = jwtStorage.isAuthenticated();

  // Handle navigation in useEffect to avoid React warnings
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/signin");
    }
  }, [isAuthenticated]);

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

  // Don't render anything if not authenticated (navigation will happen in useEffect)
  if (!isAuthenticated) {
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

      <ThemedView style={styles.userInfo}>
        <ThemedText type="subtitle">Bluesky Account</ThemedText>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>Handle:</ThemedText>
          <ThemedText style={styles.value}>{userData.email}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>User ID:</ThemedText>
          <ThemedText style={styles.value}>{userData.userId}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.label}>Status:</ThemedText>
          <ThemedText style={[styles.value, styles.authenticated]}>
            ✅ Connected to Bluesky
          </ThemedText>
        </ThemedView>
      </ThemedView>

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
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
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
