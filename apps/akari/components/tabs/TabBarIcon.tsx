import React from 'react';

import { IconSymbol } from '@/components/ui/IconSymbol';

export function TabBarIcon(props: { name: React.ComponentProps<typeof IconSymbol>['name']; color: string }) {
  return <IconSymbol size={28} style={{ marginBottom: -3 }} {...props} />;
}
