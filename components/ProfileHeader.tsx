import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBorderColor } from "@/hooks/useBorderColor";

type ProfileHeaderProps = {
  profile: {
    avatar?: string;
    displayName?: string;
    handle: string;
    description?: string;
    banner?: string;
  };
};

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const borderColor = useBorderColor();

  return (
    <>
      {/* Banner */}
      {profile.banner && (
        <ThemedView style={styles.banner}>
          <Image
            source={{ uri: profile.banner }}
            style={styles.bannerImage}
            contentFit="cover"
          />
        </ThemedView>
      )}

      {/* Profile Header */}
      <ThemedView
        style={[styles.profileHeader, { borderBottomColor: borderColor }]}
      >
        {/* Avatar and Name Section */}
        <View style={styles.avatarNameSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {profile.avatar ? (
              <View style={styles.avatar}>
                <Image
                  source={{ uri: profile.avatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              </View>
            ) : (
              <View style={styles.avatar}>
                <View style={styles.avatarFallbackContainer}>
                  <ThemedText style={styles.avatarFallback}>
                    {(profile.displayName ||
                      profile.handle ||
                      "U")[0].toUpperCase()}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>

          <ThemedView style={styles.profileInfo}>
            <ThemedText style={styles.displayName}>
              {profile.displayName || profile.handle}
            </ThemedText>
            <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
          </ThemedView>
        </View>

        {/* Description - Full Width */}
        {profile.description && (
          <ThemedView style={styles.descriptionContainer}>
            <ThemedText style={styles.description}>
              {profile.description}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 120,
    backgroundColor: "#f0f0f0",
  },
  bannerImage: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
  },
  avatarNameSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    marginTop: -30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarFallbackContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallback: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  handle: {
    fontSize: 16,
    opacity: 0.7,
  },
  description: {
    fontSize: 16,
    lineHeight: 20,
  },
  descriptionContainer: {
    marginTop: 4,
  },
});
