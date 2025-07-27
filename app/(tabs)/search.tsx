import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

type SearchResult = {
  type: "profile" | "post";
  data: any;
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const insets = useSafeAreaInsets();

  const backgroundColor = useThemeColor(
    {
      light: "#ffffff",
      dark: "#000000",
    },
    "background"
  );

  const textColor = useThemeColor(
    {
      light: "#000000",
      dark: "#ffffff",
    },
    "text"
  );

  const borderColor = useThemeColor(
    {
      light: "#e8eaed",
      dark: "#2d3133",
    },
    "background"
  );

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      // Search for profiles
      const profileResults = await blueskyApi.searchProfiles(token, query, 10);

      // Search for posts
      const postResults = await blueskyApi.searchPosts(token, query, 10);

      const combinedResults: SearchResult[] = [
        ...(profileResults.actors || []).map((profile: any) => ({
          type: "profile" as const,
          data: profile,
        })),
        ...(postResults.posts || []).map((post: any) => ({
          type: "post" as const,
          data: post,
        })),
      ];

      setResults(combinedResults);
    } catch (error) {
      console.error("Search error:", error);
      // Show a more user-friendly error message
      if (error instanceof Error) {
        console.error("Search error details:", error.message);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const renderProfileResult = ({ item }: { item: SearchResult }) => {
    if (item.type !== "profile") return null;

    const profile = item.data;
    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: borderColor }]}
        onPress={() =>
          router.push(`/profile/${encodeURIComponent(profile.handle)}`)
        }
        activeOpacity={0.7}
      >
        <ThemedView style={styles.profileContainer}>
          {profile.avatar && (
            <Image
              source={{ uri: profile.avatar }}
              style={styles.profileAvatar}
              contentFit="cover"
              placeholder={require("@/assets/images/partial-react-logo.png")}
            />
          )}
          <ThemedView style={styles.profileInfo}>
            <ThemedText style={[styles.displayName, { color: textColor }]}>
              {profile.displayName || profile.handle}
            </ThemedText>
            <ThemedText style={[styles.handle, { color: textColor }]}>
              @{profile.handle}
            </ThemedText>
            {profile.description && (
              <ThemedText
                style={[styles.description, { color: textColor }]}
                numberOfLines={2}
              >
                {profile.description}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderPostResult = ({ item }: { item: SearchResult }) => {
    if (item.type !== "post") return null;

    const post = item.data;
    return (
      <PostCard
        post={{
          id: post.uri,
          text: post.record?.text || "No text content",
          author: {
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
          },
          createdAt: new Date(post.indexedAt).toLocaleDateString(),
          likeCount: post.likeCount || 0,
          commentCount: post.replyCount || 0,
          repostCount: post.repostCount || 0,
          embed: post.embed,
          embeds: post.embeds,
        }}
        onPress={() => {
          router.push(`/post/${encodeURIComponent(post.uri)}`);
        }}
      />
    );
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    if (item.type === "profile") {
      return renderProfileResult({ item });
    } else if (item.type === "post") {
      return renderPostResult({ item });
    }
    return null;
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Search
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: backgroundColor,
              borderColor: borderColor,
              color: textColor,
            },
          ]}
          placeholder="Search profiles and posts..."
          placeholderTextColor="#999999"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: borderColor }]}
          onPress={handleSearch}
          disabled={isSearching}
        >
          <ThemedText style={styles.searchButtonText}>
            {isSearching ? "Searching..." : "Search"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        style={styles.resultsList}
        contentContainerStyle={styles.resultsListContent}
        ListEmptyComponent={
          query ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={[styles.emptyStateText, { color: textColor }]}>
                {isSearching ? "Searching..." : "No results found"}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={[styles.emptyStateText, { color: textColor }]}>
                Search for profiles and posts on Bluesky
              </ThemedText>
            </ThemedView>
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 100,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  handle: {
    fontSize: 14,
    opacity: 0.7,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
