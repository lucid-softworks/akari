import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Explore Akari
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Discover what&apos;s new and exciting
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Features
          </ThemedText>
          <ThemedView style={styles.featureList}>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>🔐</ThemedText>
              <ThemedText style={styles.featureText}>
                Secure Authentication
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>🔄</ThemedText>
              <ThemedText style={styles.featureText}>
                TanStack Query Integration
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>🎨</ThemedText>
              <ThemedText style={styles.featureText}>
                Themed UI Components
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>📱</ThemedText>
              <ThemedText style={styles.featureText}>
                Cross-platform Support
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Getting Started
          </ThemedText>
          <ThemedText style={styles.description}>
            Welcome to Akari! This app demonstrates secure authentication using
            encrypted storage and modern React Native development practices.
          </ThemedText>
          <ThemedText style={styles.description}>
            The authentication system uses react-native-mmkv for secure token
            storage, ensuring your data is protected with encryption.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Development
          </ThemedText>
          <ThemedText style={styles.description}>
            This project is built with Expo Router for navigation, TanStack
            Query for data fetching, and includes comprehensive TypeScript
            support.
          </ThemedText>
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
  content: {
    gap: 32,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
    fontWeight: "500",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
});
