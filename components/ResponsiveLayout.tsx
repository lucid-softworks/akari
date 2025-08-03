import React from 'react';
import { View } from 'react-native';

import { Sidebar } from '@/components/Sidebar';
import { ThemedView } from '@/components/ThemedView';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { isLargeScreen } = useResponsive();

  if (isLargeScreen) {
    return (
      <ThemedView style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar />
        <View
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 500,
              height: '100%',
              paddingHorizontal: 16,
            }}
          >
            {children}
          </View>
        </View>
      </ThemedView>
    );
  }

  return <>{children}</>;
}
