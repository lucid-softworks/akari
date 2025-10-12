import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTabContext } from '@/contexts/TabContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useThemeColor } from '@/hooks/useThemeColor';

type TabBackButtonProps = {
  onPress?: () => void;
};

export function TabBackButton({ onPress }: TabBackButtonProps) {
  const router = useRouter();
  const { activeTab, goBackInTab } = useTabContext();
  const { data: currentAccount } = useCurrentAccount();
  const tintColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (activeTab) {
      // Try to go back in the current tab's history
      const previousRoute = goBackInTab(activeTab);

      if (previousRoute) {
        // Navigate to the previous route in this tab using push to maintain navigation stack
        router.push(previousRoute as any);
        return;
      }
    }

    // Fallback: navigate to the tab's root using push
    const tabRoute =
      activeTab === 'index' ? '/' : activeTab === 'profile' ? `/profile/${currentAccount?.handle || ''}` : `/${activeTab}`;
    router.push(tabRoute as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        padding: 8,
        marginLeft: Platform.OS === 'ios' ? -8 : 0,
      }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <IconSymbol name="chevron.left" size={24} color={tintColor} />
    </TouchableOpacity>
  );
}
