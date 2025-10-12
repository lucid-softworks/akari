import React from 'react';
import { View } from 'react-native';

import { AppTabBar } from '@/components/AppTabBar';
import { Sidebar } from '@/components/Sidebar';
import { useResponsive } from '@/hooks/useResponsive';

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const { isLargeScreen } = useResponsive();

  if (isLargeScreen) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar />
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      <AppTabBar />
    </View>
  );
}
