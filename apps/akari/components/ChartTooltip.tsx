import React from 'react';

import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

type ChartTooltipProps = {
  visible: boolean;
  x: number;
  y: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
};

export function ChartTooltip({ visible, x, y, onMouseEnter, onMouseLeave, children }: ChartTooltipProps) {
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({}, 'background');

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        width: 200,
        height: 240,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor,
        backgroundColor,
        padding: 12,
        zIndex: 999999,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        left: x,
        top: y,
        overflow: 'hidden',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}
