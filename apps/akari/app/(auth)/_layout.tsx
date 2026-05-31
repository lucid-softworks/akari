import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="signin"
        options={{
          title: "Sign In",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="oauth"
        options={{
          title: "Sign in with atproto",
          headerShown: Platform.OS !== 'web',
        }}
      />
      <Stack.Screen
        name="password"
        options={{
          title: "Sign in with app password",
          headerShown: Platform.OS !== 'web',
        }}
      />
      <Stack.Screen
        name="mastodon"
        options={{
          title: "Sign in with Mastodon",
          headerShown: Platform.OS !== 'web',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: "Create account",
          headerShown: Platform.OS !== 'web',
        }}
      />
    </Stack>
  );
}
