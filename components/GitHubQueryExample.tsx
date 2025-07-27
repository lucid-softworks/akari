import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export function GitHubQueryExample() {
  const { isPending, error, data } = useQuery({
    queryKey: ["repoData"],
    queryFn: () =>
      fetch("https://api.github.com/repos/TanStack/query").then((res) =>
        res.json()
      ),
  });

  if (isPending) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          An error has occurred: {error.message}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {data.name}
      </ThemedText>
      <ThemedText style={styles.description}>{data.description}</ThemedText>
      <ThemedView style={styles.statsContainer}>
        <ThemedText style={styles.stat}>👀 {data.subscribers_count}</ThemedText>
        <ThemedText style={styles.stat}>✨ {data.stargazers_count}</ThemedText>
        <ThemedText style={styles.stat}>🍴 {data.forks_count}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  stat: {
    fontSize: 16,
    fontWeight: "600",
  },
});
