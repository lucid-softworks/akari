import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="signin"
        options={{
          title: "Sign In",
          headerShown: Platform.OS !== 'web',
        }}
      />
    </Stack>
  );
}
