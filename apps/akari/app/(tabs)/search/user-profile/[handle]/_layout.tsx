import { router, Stack } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';

function BackButton() {
  const color = useThemeColor({}, 'text');
  return (
    <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
      <IconSymbol name="chevron.left" size={22} color={color} />
    </TouchableOpacity>
  );
}

export default function UserProfileLayout() {
  const { isLargeScreen } = useResponsive();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="post/[rkey]"
        options={{
          title: 'Post',
          headerShown: isLargeScreen,
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}
