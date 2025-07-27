import { ScrollView, StyleSheet } from "react-native";

import { ThemedFeatureCard } from "@/components/ThemedFeatureCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <ThemedFeatureCard style={styles.featureItem}>
                <ThemedText style={styles.featureIcon}>🔐</ThemedText>
                <ThemedText style={styles.featureText}>
                  Secure Authentication
                </ThemedText>
              </ThemedFeatureCard>
              <ThemedFeatureCard style={styles.featureItem}>
                <ThemedText style={styles.featureIcon}>🔄</ThemedText>
                <ThemedText style={styles.featureText}>
                  TanStack Query Integration
                </ThemedText>
              </ThemedFeatureCard>
              <ThemedFeatureCard style={styles.featureItem}>
                <ThemedText style={styles.featureIcon}>🎨</ThemedText>
                <ThemedText style={styles.featureText}>
                  Themed UI Components
                </ThemedText>
              </ThemedFeatureCard>
              <ThemedFeatureCard style={styles.featureItem}>
                <ThemedText style={styles.featureIcon}>📱</ThemedText>
                <ThemedText style={styles.featureText}>
                  Cross-platform Support
                </ThemedText>
              </ThemedFeatureCard>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Getting Started
            </ThemedText>
            <ThemedText style={styles.description}>
              Welcome to Akari! This app demonstrates secure authentication
              using encrypted storage and modern React Native development
              practices.
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
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
    opacity: 0.8,
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
    // Styles are now handled by ThemedFeatureCard
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
