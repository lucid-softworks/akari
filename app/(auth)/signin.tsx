import { router } from "expo-router";
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
import { jwtStorage } from "@/utils/secureStorage";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      // TODO: Replace with your actual Bluesky API call
      // const response = await signInToBluesky(handle, appPassword);

      // For demo purposes, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful Bluesky response
      const mockResponse = {
        accessJwt:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        refreshJwt: "refresh-token-123",
        handle: handle.includes("@") ? handle : `@${handle}`,
        did: "did:plc:user123",
        user: {
          id: "user123",
          handle: handle.includes("@") ? handle : `@${handle}`,
        },
      };

      // Store tokens securely
      jwtStorage.setToken(mockResponse.accessJwt);
      jwtStorage.setRefreshToken(mockResponse.refreshJwt);
      jwtStorage.setUserData(mockResponse.user.id, mockResponse.user.handle);

      Alert.alert("Success", "Signed in to Bluesky successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        "Sign in failed. Please check your handle and app password."
      );
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);

    try {
      // TODO: Replace with your actual Bluesky API call
      // const response = await signUpToBluesky(handle, appPassword);

      // For demo purposes, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful Bluesky response
      const mockResponse = {
        accessJwt:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        refreshJwt: "refresh-token-123",
        handle: handle.includes("@") ? handle : `@${handle}`,
        did: "did:plc:user123",
        user: {
          id: "user123",
          handle: handle.includes("@") ? handle : `@${handle}`,
        },
      };

      // Store tokens securely
      jwtStorage.setToken(mockResponse.accessJwt);
      jwtStorage.setRefreshToken(mockResponse.refreshJwt);
      jwtStorage.setUserData(mockResponse.user.id, mockResponse.user.handle);

      Alert.alert("Success", "Bluesky account connected successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    // Clear form when switching modes
    setHandle("");
    setAppPassword("");
  };

  const isSignUp = mode === "signup";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {isSignUp ? "Connect Bluesky" : "Sign in to Bluesky"}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {isSignUp
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
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading
                  ? isSignUp
                    ? "Connecting..."
                    : "Signing In..."
                  : isSignUp
                  ? "Connect Account"
                  : "Sign In"}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

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
