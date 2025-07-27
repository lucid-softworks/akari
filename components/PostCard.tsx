import { StyleSheet } from "react-native";

import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

type PostCardProps = {
  post: {
    id: string;
    text: string;
    author: {
      handle: string;
      displayName?: string;
    };
    createdAt: string;
  };
};

export function PostCard({ post }: PostCardProps) {
  return (
    <ThemedCard style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.authorInfo}>
          <ThemedText style={styles.displayName}>
            {post.author.displayName || post.author.handle}
          </ThemedText>
          <ThemedText style={styles.handle}>@{post.author.handle}</ThemedText>
        </ThemedView>
        <ThemedText style={styles.timestamp}>{post.createdAt}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText style={styles.text}>{post.text}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.footer}>
        <ThemedText style={styles.notImplemented}>
          🚧 Post interactions not implemented yet
        </ThemedText>
      </ThemedView>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  handle: {
    fontSize: 14,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  content: {
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e1e5e9",
    paddingTop: 12,
  },
  notImplemented: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
    textAlign: "center",
  },
});
