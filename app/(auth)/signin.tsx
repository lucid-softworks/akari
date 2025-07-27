import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSignIn } from "@/hooks/mutations/useSignIn";
import { jwtStorage } from "@/utils/secureStorage";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const { addAccount } = useLocalSearchParams<{ addAccount?: string }>();
  const isAddingAccount = addAccount === "true";

  const [mode, setMode] = useState<AuthMode>("signin");
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [pdsUrl, setPdsUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const signInMutation = useSignIn();

  const validateHandle = (handle: string) => {
    // Bluesky handles can be @username.bsky.social or just username
    const handleRegex = /^@?[a-zA-Z0-9._-]+$/;
    return handleRegex.test(handle.replace(".bsky.social", ""));
  };

  const handleSignIn = async () => {
    if (!handle || !appPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateHandle(handle)) {
      Alert.alert("Error", "Please enter a valid Bluesky handle");
      return;
    }

    try {
      const result = await signInMutation.mutateAsync({
        identifier: handle,
        password: appPassword,
        pdsUrl: pdsUrl || undefined,
      });

      // If adding account, store it in multi-account system
      if (isAddingAccount) {
        const accountId = jwtStorage.addAccount({
          did: result.did,
          handle: result.handle,
          jwtToken: result.accessJwt,
          refreshToken: result.refreshJwt,
        });

        // Set the newly added account as current
        jwtStorage.switchAccount(accountId);

        Alert.alert("Success", "Account added successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/settings"),
          },
        ]);
      } else {
        // For first-time sign in, use the old single-account system
        jwtStorage.setToken(result.accessJwt);
        jwtStorage.setRefreshToken(result.refreshJwt);
        jwtStorage.setUserData(result.did, result.handle);

        Alert.alert("Success", "Signed in to Bluesky successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Sign in failed. Please check your handle and app password."
      );
    }
  };

  const handleSignUp = async () => {
    if (!handle || !appPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateHandle(handle)) {
      Alert.alert("Error", "Please enter a valid Bluesky handle");
      return;
    }

    if (appPassword.length < 6) {
      Alert.alert("Error", "App password must be at least 6 characters long");
      return;
    }

    try {
      // For signup, we also use createSession since Bluesky accounts are created via web
      const result = await signInMutation.mutateAsync({
        identifier: handle,
        password: appPassword,
        pdsUrl: pdsUrl || undefined,
      });

      // If adding account, store it in multi-account system
      if (isAddingAccount) {
        const accountId = jwtStorage.addAccount({
          did: result.did,
          handle: result.handle,
          jwtToken: result.accessJwt,
          refreshToken: result.refreshJwt,
        });

        // Set the newly added account as current
        jwtStorage.switchAccount(accountId);

        Alert.alert("Success", "Account added successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/settings"),
          },
        ]);
      } else {
        // For first-time sign in, use the old single-account system
        jwtStorage.setToken(result.accessJwt);
        jwtStorage.setRefreshToken(result.refreshJwt);
        jwtStorage.setUserData(result.did, result.handle);

        Alert.alert("Success", "Bluesky account connected successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]);
      }
    } catch (error) {
      console.error("Sign up error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Sign up failed. Please try again."
      );
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    // Clear form when switching modes
    setHandle("");
    setAppPassword("");
  };

  const isSignUp = mode === "signup";
  const isLoading = signInMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {isAddingAccount
                ? "Add Account"
                : isSignUp
                ? "Connect Bluesky"
                : "Sign in to Bluesky"}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {isAddingAccount
                ? "Add another Bluesky account to your app"
                : isSignUp
                ? "Connect your Bluesky account to get started"
                : "Sign in with your Bluesky handle and app password"}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Bluesky Handle</ThemedText>
              <TextInput
                style={styles.input}
                value={handle}
                onChangeText={setHandle}
                placeholder="username.bsky.social or @username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              <ThemedText style={styles.helperText}>
                Enter your Bluesky handle (e.g., username.bsky.social)
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>App Password</ThemedText>
              <TextInput
                style={styles.input}
                value={appPassword}
                onChangeText={setAppPassword}
                placeholder="Enter your app password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              <ThemedText style={styles.helperText}>
                Use an app password from your Bluesky account settings
              </ThemedText>
            </ThemedView>

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <ThemedText style={styles.advancedToggleText}>
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </ThemedText>
            </TouchableOpacity>

            {showAdvanced && (
              <ThemedView style={styles.inputContainer}>
                <ThemedText style={styles.label}>
                  Custom PDS Server (Optional)
                </ThemedText>
                <TextInput
                  style={styles.input}
                  value={pdsUrl}
                  onChangeText={setPdsUrl}
                  placeholder="https://your-pds.com (leave empty for default)"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                />
                <ThemedText style={styles.helperText}>
                  Use a custom Personal Data Server (default: bsky.social)
                </ThemedText>
              </ThemedView>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading
                  ? isAddingAccount
                    ? "Adding Account..."
                    : isSignUp
                    ? "Connecting..."
                    : "Signing In..."
                  : isAddingAccount
                  ? "Add Account"
                  : isSignUp
                  ? "Connect Account"
                  : "Sign In"}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {!isAddingAccount && (
            <ThemedView style={styles.footer}>
              <ThemedText style={styles.footerText}>
                {isSignUp
                  ? "Already connected? "
                  : "Need to connect a different account? "}
              </ThemedText>
              <TouchableOpacity onPress={toggleMode}>
                <ThemedText style={styles.linkText}>
                  {isSignUp ? "Sign In" : "Connect New"}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          <ThemedView style={styles.infoSection}>
            <ThemedText type="subtitle" style={styles.infoTitle}>
              How to get your app password:
            </ThemedText>
            <ThemedText style={styles.infoText}>
              1. Go to Bluesky web app{"\n"}
              2. Navigate to Settings → App Passwords{"\n"}
              3. Create a new app password{"\n"}
              4. Use that password here
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    padding: 24,
    gap: 32,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  helperText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
  },
  advancedToggle: {
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    color: "#007AFF",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
  },
  linkText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
});
