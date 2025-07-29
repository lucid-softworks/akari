import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Labels } from "@/components/Labels";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlockUser } from "@/hooks/mutations/useBlockUser";
import { useFollowUser } from "@/hooks/mutations/useFollowUser";
import { useBorderColor } from "@/hooks/useBorderColor";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useTranslation } from "@/hooks/useTranslation";

type ProfileHeaderProps = {
  profile: {
    avatar?: string;
    displayName?: string;
    handle: string;
    description?: string;
    banner?: string;
    did?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    viewer?: {
      following?: string;
      blocking?: string;
      blockedBy?: boolean;
    };
    labels?: {
      val: string;
      src: string;
      cts: string;
      uri: string;
      cid?: string;
      neg?: boolean;
      value?: string;
      text?: string;
      label?: string;
      ver?: number;
      exp?: string;
    }[];
  };
  isOwnProfile?: boolean;
};

const formatNumber = (num: number, locale: string): string => {
  const formatter = new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
  });
  return formatter.format(num);
};

export function ProfileHeader({
  profile,
  isOwnProfile = false,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const borderColor = useBorderColor();
  const followMutation = useFollowUser();
  const blockMutation = useBlockUser();

  const dropdownBackgroundColor = useThemeColor(
    {
      light: "#ffffff",
      dark: "#1c1c1e",
    },
    "background"
  );

  const isFollowing = !!profile.viewer?.following;
  const isBlocking = !!profile.viewer?.blocking;
  const isBlockedBy = profile.viewer?.blockedBy;

  const handleFollow = async () => {
    if (!profile.did) return;

    try {
      if (isFollowing) {
        await followMutation.mutateAsync({
          did: profile.did,
          followUri: profile.viewer?.following,
          action: "unfollow",
        });
      } else {
        await followMutation.mutateAsync({
          did: profile.did,
          action: "follow",
        });
      }
      setShowDropdown(false);
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  const handleBlock = async () => {
    if (!profile.did) return;

    try {
      if (isBlocking) {
        await blockMutation.mutateAsync({
          did: profile.did,
          blockUri: profile.viewer?.blocking,
          action: "unblock",
        });
      } else {
        await blockMutation.mutateAsync({
          did: profile.did,
          action: "block",
        });
      }
      setShowDropdown(false);
    } catch {
      // Handle block error
    }
  };

  const handleSearchPosts = () => {
    router.push(`/(tabs)/search?query=from:${profile.handle}`);
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleFollowPress = () => {
    if (isFollowing) {
      Alert.alert(
        t("common.unfollow"),
        t("profile.unfollowConfirmation", { handle: profile.handle }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.unfollow"),
            style: "destructive",
            onPress: handleFollow,
          },
        ]
      );
    } else {
      handleFollow();
    }
  };

  const handleBlockPress = () => {
    if (isBlocking) {
      Alert.alert(
        t("common.unblock"),
        t("profile.unblockConfirmation", { handle: profile.handle }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.unblock"),
            style: "destructive",
            onPress: handleBlock,
          },
        ]
      );
    } else {
      Alert.alert(
        t("common.block"),
        t("profile.blockConfirmation", { handle: profile.handle }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.block"),
            style: "destructive",
            onPress: handleBlock,
          },
        ]
      );
    }
  };

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

          {/* Action Buttons */}
          <ThemedView style={styles.actionButtons}>
            {/* Search Button - Always show */}
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: borderColor }]}
              onPress={handleSearchPosts}
            >
              <IconSymbol name="magnifyingglass" size={20} color="#007AFF" />
            </TouchableOpacity>

            {/* Dropdown Menu - Only show for other profiles */}
            {!isOwnProfile && !isBlockedBy && (
              <ThemedView style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.iconButton, { borderColor: borderColor }]}
                  onPress={handleDropdownToggle}
                >
                  <IconSymbol name="ellipsis" size={20} color="#007AFF" />
                </TouchableOpacity>

                {showDropdown && (
                  <ThemedView style={styles.dropdownOverlay}>
                    <TouchableWithoutFeedback
                      onPress={() => setShowDropdown(false)}
                    >
                      <ThemedView style={styles.dropdownOverlayTouchable} />
                    </TouchableWithoutFeedback>
                    <ThemedView
                      style={[
                        styles.dropdown,
                        {
                          borderColor: borderColor,
                          backgroundColor: dropdownBackgroundColor,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleFollowPress}
                        disabled={followMutation.isPending}
                      >
                        <ThemedText style={styles.dropdownItemText}>
                          {followMutation.isPending
                            ? t("common.loading")
                            : isFollowing
                            ? t("common.unfollow")
                            : t("common.follow")}
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleBlockPress}
                        disabled={blockMutation.isPending}
                      >
                        <ThemedText style={styles.dropdownItemText}>
                          {blockMutation.isPending
                            ? t("common.loading")
                            : isBlocking
                            ? t("common.unblock")
                            : t("common.block")}
                        </ThemedText>
                      </TouchableOpacity>
                    </ThemedView>
                  </ThemedView>
                )}
              </ThemedView>
            )}
          </ThemedView>
        </View>

        {/* Stats */}
        <ThemedView style={styles.statsContainer}>
          <ThemedText style={styles.statText}>
            {t("profile.posts")}{" "}
            {formatNumber(profile.postsCount || 0, currentLocale)} •{" "}
            {t("profile.followers")}{" "}
            {formatNumber(profile.followersCount || 0, currentLocale)} •{" "}
            {t("profile.following")}{" "}
            {formatNumber(profile.followsCount || 0, currentLocale)}
          </ThemedText>
        </ThemedView>

        {/* Description - Full Width */}
        {profile.description && (
          <ThemedView style={styles.descriptionContainer}>
            <ThemedText style={styles.description}>
              {profile.description}
            </ThemedText>
          </ThemedView>
        )}

        {/* Labels */}
        <Labels labels={profile.labels} />

        {isBlockedBy && (
          <ThemedView style={styles.blockedMessage}>
            <ThemedText style={styles.blockedText}>
              {t("profile.youAreBlockedByUser")}
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
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownContainer: {
    position: "relative",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  dropdownOverlayTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdown: {
    position: "absolute",
    top: 45,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    zIndex: 1001,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  blockedMessage: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  blockedText: {
    fontSize: 14,
    color: "#c62828",
    textAlign: "center",
  },
  statsContainer: {
    marginTop: 8,
    marginBottom: 6,
  },
  statText: {
    fontSize: 15,
    opacity: 0.8,
  },
});
