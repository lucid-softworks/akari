import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '@/theme';

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
  const { colors } = useAppTheme();
  const backgroundColor = colors.surface;
  const borderColor = colors.border;
  const headerBackground = colors.surfaceSecondary;
  const titleColor = colors.text;

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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});
