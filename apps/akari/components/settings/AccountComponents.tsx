import { Image } from 'expo-image';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Account } from '@/types/account';

export type AccountRowProps = {
  account: Account;
  avatar?: string | null;
  displayName?: string | null;
  isCurrent: boolean;
  onSwitch?: () => void;
  onRemove: () => void;
  switchLabel: string;
  removeLabel: string;
  currentLabel: string;
  borderColor: string;
};

export type InfoRowProps = {
  label: string;
  value: string;
  borderColor: string;
  monospace?: boolean;
};

export function AccountRow({
  account,
  avatar,
  borderColor,
  currentLabel,
  displayName,
  isCurrent,
  onRemove,
  onSwitch,
  removeLabel,
  switchLabel,
}: AccountRowProps) {
  const fallbackLetter = (displayName || account.handle || 'U').charAt(0).toUpperCase();

  return (
    <ThemedView style={[styles.accountRow, { borderBottomColor: borderColor }]}>
      <ThemedView style={styles.accountAvatarContainer}>
        {avatar ? (
          <Image contentFit="cover" source={{ uri: avatar }} style={styles.accountAvatarImage} />
        ) : (
          <ThemedView style={styles.accountAvatarFallback}>
            <ThemedText style={styles.accountAvatarFallbackText}>{fallbackLetter}</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.accountDetails}>
        <ThemedText style={styles.accountHandle}>@{account.handle}</ThemedText>
        {displayName ? <ThemedText style={styles.accountDisplayName}>{displayName}</ThemedText> : null}
        {isCurrent ? <ThemedText style={styles.currentAccountBadge}>{currentLabel}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.accountActions}>
        {onSwitch ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={onSwitch}
            style={[styles.accountActionButton, styles.accountActionButtonPrimary]}
          >
            <ThemedText style={[styles.accountActionText, styles.accountActionPrimary]}>{switchLabel}</ThemedText>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={onRemove}
          style={[styles.accountActionButton, !onSwitch && styles.accountActionButtonPrimary]}
        >
          <ThemedText style={[styles.accountActionText, styles.accountActionDestructive]}>{removeLabel}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

export function InfoRow({ borderColor, label, monospace = false, value }: InfoRowProps) {
  return (
    <ThemedView style={[styles.infoRow, { borderBottomColor: borderColor }]}>
      <ThemedText style={styles.infoRowLabel}>{label}</ThemedText>
      <ThemedText
        numberOfLines={1}
        selectable
        style={[styles.infoRowValue, monospace && styles.infoRowMonospace]}
      >
        {value}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accountAvatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  accountAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  accountAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountDetails: {
    flex: 1,
  },
  accountHandle: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountDisplayName: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  currentAccountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 6,
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  accountActionButton: {
    marginLeft: 12,
  },
  accountActionButtonPrimary: {
    marginLeft: 0,
  },
  accountActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountActionPrimary: {
    color: '#007AFF',
  },
  accountActionDestructive: {
    color: '#DC2626',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoRowValue: {
    marginLeft: 16,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  infoRowMonospace: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});

