import React from 'react';
import { Platform, View } from 'react-native';

import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Sidebar } from '@/components/Sidebar';
import { ThemedView } from '@/components/ThemedView';
import { useResponsive } from '@/hooks/useResponsive';

type ResponsiveLayoutProps = {
  children: React.ReactNode;
};

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { isLargeScreen } = useResponsive();
  const shouldShowSidebar = Platform.OS === 'web' || isLargeScreen;

  if (shouldShowSidebar) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingTop: 16,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: 24,
              width: '100%',
              maxWidth: 1200,
            }}
          >
            <Sidebar />
            <View
              style={{
                flex: 1,
              }}
            >
              {children}
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      <MobileBottomNav />
    </View>
  );
}
