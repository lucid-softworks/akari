import { router } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

type PostCardProps = {
  post: {
    id: string;
    text: string;
    author: {
      handle: string;
      displayName?: string;
    };
    createdAt: string;
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
  };
  onPress?: () => void;
};

export function PostCard({ post, onPress }: PostCardProps) {
  const borderColor = useThemeColor(
    {
      light: "#e8eaed",
      dark: "#2d3133",
    },
    "background"
  );

  const handleProfilePress = () => {
    router.push(`/profile/${encodeURIComponent(post.author.handle)}`);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.header}>
        <ThemedView style={styles.authorInfo}>
          <ThemedText style={styles.displayName}>
            {post.author.displayName || post.author.handle}
          </ThemedText>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <ThemedText style={styles.handle}>@{post.author.handle}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedText style={styles.timestamp}>{post.createdAt}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText style={styles.text}>{post.text}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.interactions}>
        <ThemedView style={styles.interactionItem}>
          <ThemedText style={styles.interactionIcon}>💬</ThemedText>
          <ThemedText style={styles.interactionCount}>
            {post.commentCount || 0}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.interactionItem}>
          <ThemedText style={styles.interactionIcon}>🔄</ThemedText>
          <ThemedText style={styles.interactionCount}>
            {post.repostCount || 0}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.interactionItem}>
          <ThemedText style={styles.interactionIcon}>❤️</ThemedText>
          <ThemedText style={styles.interactionCount}>
            {post.likeCount || 0}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
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
  interactions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  interactionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  interactionIcon: {
    fontSize: 16,
  },
  interactionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
});
