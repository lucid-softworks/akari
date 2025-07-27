import { useNavigationState } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React, { useRef } from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { tabScrollRegistry } from "@/utils/tabScrollRegistry";

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof IconSymbol>["name"];
  color: string;
}) {
  return <IconSymbol size={28} style={{ marginBottom: -3 }} {...props} />;
}

/**
 * Custom tab button that tracks which tab is being pressed
 */
function CustomTabButton(props: any) {
  const navigationState = useNavigationState((state) => state);
  const lastPressedTabRef = useRef<string | null>(null);

  console.log(
    "CustomTabButton created, navigation state:",
    navigationState?.routes?.map((r) => r.name)
  );

  const handleTabPress = () => {
    const currentRoute = navigationState?.routes?.[navigationState.index]?.name;

    console.log(
      "Tab pressed, current route:",
      currentRoute,
      "last pressed:",
      lastPressedTabRef.current
    );

    if (currentRoute) {
      // Check if this is the same tab pressed again
      if (lastPressedTabRef.current === currentRoute) {
        console.log(
          "Same tab pressed twice, triggering scroll for:",
          currentRoute
        );
        tabScrollRegistry.handleTabPress(currentRoute);
      }

      lastPressedTabRef.current = currentRoute;
    }
  };

  return <HapticTab {...props} onTabPress={handleTabPress} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: CustomTabButton,
        tabBarBackground: TabBarBackground,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="bell.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="message.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="person.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
