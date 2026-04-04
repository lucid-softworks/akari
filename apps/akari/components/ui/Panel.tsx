import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { spacing, fontSize, fontWeight } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

type PanelProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
};

export function Panel({
  title,
  children,
  headerActions,
  footerActions,
  testID,
  style,
  contentStyle,
  footerStyle,
}: PanelProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const headerBackground = useThemeColor({ light: '#F9FAFB', dark: '#1c1c1e' }, 'background');
  const titleColor = useThemeColor({ light: '#111827', dark: '#F4F4F5' }, 'text');

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: headerBackground,
            borderColor,
          },
        ]}
      >
        <ThemedText style={[styles.title, { color: titleColor }]}>{title}</ThemedText>
        {headerActions ? <View style={styles.headerActions}>{headerActions}</View> : null}
      </View>

      <View style={[styles.body, contentStyle]}>{children}</View>

      {footerActions ? (
        <View
          style={[
            styles.footer,
            {
              borderColor,
            },
            footerStyle,
          ]}
        >
          {footerActions}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});
