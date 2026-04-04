import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="signin"
        options={{
          title: "Sign In",
        }}
      />
    </Stack>
  );
}
