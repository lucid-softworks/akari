import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DialogModal } from '@/components/ui/DialogModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';
import { showAlert } from '@/utils/alert';
import { getTranslationReport } from '@/utils/translationLogger';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

type IconName = Parameters<typeof IconSymbol>[0]['name'];

type SettingsRowDescriptor = {
  key: string;
  icon?: IconName;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
};

type AccountRowProps = {
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
  showDivider?: boolean;
};

type InfoRowProps = {
  label: string;
  value: string;
  borderColor: string;
  showDivider?: boolean;
  monospace?: boolean;
};

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  isFirst?: boolean;
};

type SettingsRowProps = SettingsRowDescriptor & {
  borderColor: string;
  showDivider?: boolean;
};

const EXTERNAL_LINKS = {
  helpCenter: 'https://help.bsky.app/',
  status: 'https://status.bsky.app/',
  changeLog: 'https://blueskyweb.xyz/blog',
  feedback: 'https://help.bsky.app/hc/en-us/requests/new',
  privacy: 'https://blueskyweb.xyz/support/privacy-policy',
  terms: 'https://blueskyweb.xyz/support/tos',
} as const;

function SettingsSection({ children, isFirst = false, title }: SettingsSectionProps) {
  return (
    <ThemedView style={[styles.section, isFirst && styles.firstSection]}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function SettingsRow({
  borderColor,
  description,
  destructive = false,
  icon,
  label,
  onPress,
  showDivider = true,
  value,
}: SettingsRowProps) {
  const iconColor = useThemeColor({}, 'text');
  const chevronColor = useThemeColor(
    { light: 'rgba(17, 24, 39, 0.35)', dark: 'rgba(255, 255, 255, 0.35)' },
    'text',
  );

  const content = (
    <>
      {icon ? <IconSymbol color={iconColor} name={icon} size={20} style={styles.rowIcon} /> : null}
      <ThemedView style={styles.rowContent}>
        <ThemedText style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</ThemedText>
        {description ? (
          <ThemedText
            darkColor="rgba(255, 255, 255, 0.6)"
            lightColor="rgba(17, 24, 39, 0.6)"
            style={styles.rowDescription}
          >
            {description}
          </ThemedText>
        ) : null}
      </ThemedView>
      {value ? (
        <ThemedText
          darkColor="rgba(255, 255, 255, 0.75)"
          lightColor="rgba(17, 24, 39, 0.75)"
          numberOfLines={1}
          style={styles.rowValue}
        >
          {value}
        </ThemedText>
      ) : null}
      {onPress ? <IconSymbol color={chevronColor} name="chevron.right" size={18} /> : null}
    </>
  );

  const rowStyle = [
    styles.row,
    showDivider ? { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth } : styles.rowLast,
  ];

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onPress} style={rowStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <ThemedView style={rowStyle}>{content}</ThemedView>;
}

function CardMessage({ borderColor, message, showDivider = true }: { message: string; borderColor: string; showDivider?: boolean }) {
  return (
    <ThemedView
      style={[
        styles.cardMessage,
        showDivider ? { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth } : null,
      ]}
    >
      <ThemedText style={styles.cardMessageText}>{message}</ThemedText>
    </ThemedView>
  );
}

function AccountRow({
  account,
  avatar,
  borderColor,
  currentLabel,
  displayName,
  isCurrent,
  onRemove,
  onSwitch,
  removeLabel,
  showDivider = true,
  switchLabel,
}: AccountRowProps) {
  const fallbackLetter = (displayName || account.handle || 'U').charAt(0).toUpperCase();

  return (
    <ThemedView
      style={[
        styles.accountRow,
        showDivider ? { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth } : null,
      ]}
    >
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

function InfoRow({ borderColor, label, monospace = false, showDivider = true, value }: InfoRowProps) {
  return (
    <ThemedView
      style={[
        styles.infoRow,
        showDivider ? { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth } : null,
      ]}
    >
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const { data: accountProfiles } = useAccountProfiles();
  const scrollViewRef = useRef<ScrollView>(null);

  const switchAccountMutation = useSwitchAccount();
  const removeAccountMutation = useRemoveAccount();
  const wipeAllDataMutation = useWipeAllData();

  const handleScrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    tabScrollRegistry.register('settings', handleScrollToTop);
  }, [handleScrollToTop]);

  const version = Constants.expoConfig?.version ?? t('common.unknown');
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  const buildNumber =
    typeof iosBuildNumber === 'string'
      ? iosBuildNumber
      : typeof androidVersionCode === 'number'
        ? String(androidVersionCode)
        : typeof androidVersionCode === 'string'
          ? androidVersionCode
          : undefined;
  const variant =
    typeof Constants.expoConfig?.extra?.variant === 'string'
      ? (Constants.expoConfig.extra?.variant as string)
      : undefined;
  const showDevelopmentSection = __DEV__ || (variant ? variant !== 'production' : false);

  const openExternalLink = useCallback(
    async (url: string) => {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        showAlert({
          title: t('common.error'),
          message: t('common.failedToOpenLink'),
          buttons: [{ text: t('common.ok') }],
        });
      }
    },
    [t],
  );

  const handleCheckMissingTranslations = useCallback(() => {
    const report = getTranslationReport();

    showAlert({
      title: t('settings.checkMissingTranslations'),
      message: report,
      buttons: [{ text: t('common.ok') }],
    });
  }, [t]);

  const handleOpenDebugTools = useCallback(() => {
    router.push('/debug');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await wipeAllDataMutation.mutateAsync();
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('common.failedToLogout'),
      });
    }
  }, [t, wipeAllDataMutation]);

  const handleSwitchAccount = useCallback(
    (account: Account) => {
      if (account.did === currentAccount?.did) {
        return;
      }

      showAlert({
        title: t('common.switchAccount'),
        message: t('profile.switchToAccount', { handle: account.handle }),
        buttons: [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.switch'),
            onPress: () => {
              switchAccountMutation.mutate(account);
            },
          },
        ],
      });
    },
    [currentAccount, switchAccountMutation, t],
  );

  const handleRemoveAccount = useCallback(
    (account: Account) => {
      showAlert({
        title: t('common.removeAccount'),
        message: t('profile.removeAccountConfirmation', { handle: account.handle }),
        buttons: [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: () => {
              removeAccountMutation.mutate(account.did);

              if (account.did === currentAccount?.did) {
                router.replace('/(tabs)');
              }
            },
          },
        ],
      });
    },
    [currentAccount, removeAccountMutation, t],
  );

  const dialogManager = useDialogManager();

  const handleAddAccount = useCallback(() => {
    const closePanel = () => dialogManager.close(ADD_ACCOUNT_PANEL_ID);

    dialogManager.open({
      id: ADD_ACCOUNT_PANEL_ID,
      component: (
        <DialogModal onRequestClose={closePanel}>
          <AddAccountPanel panelId={ADD_ACCOUNT_PANEL_ID} />
        </DialogModal>
      ),
    });
  }, [dialogManager]);

  const supportRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'help-center',
        icon: 'questionmark.circle',
        label: t('settings.helpCenter'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.helpCenter),
      },
      {
        key: 'status',
        icon: 'info.circle.fill',
        label: t('settings.status'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.status),
      },
      {
        key: 'feedback',
        icon: 'bubble.left',
        label: t('settings.feedback'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.feedback),
      },
    ],
    [openExternalLink, t],
  );

  const legalRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'privacy',
        icon: 'lock.fill',
        label: t('settings.privacy'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.privacy),
      },
      {
        key: 'terms',
        icon: 'doc.text.fill',
        label: t('settings.terms'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.terms),
      },
    ],
    [openExternalLink, t],
  );

  const aboutRows = useMemo<SettingsRowDescriptor[]>(
    () => {
      const rows: SettingsRowDescriptor[] = [
        {
          key: 'change-log',
          icon: 'clock',
          label: t('settings.changeLog'),
          onPress: () => openExternalLink(EXTERNAL_LINKS.changeLog),
        },
        {
          key: 'version',
          icon: 'info.circle.fill',
          label: t('settings.version'),
          value: version,
        },
      ];

      if (buildNumber) {
        rows.push({
          key: 'build-number',
          icon: 'info.circle.fill',
          label: t('settings.buildNumber'),
          value: buildNumber,
        });
      }

      return rows;
    },
    [buildNumber, openExternalLink, t, version],
  );

  const developmentRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'check-missing-translations',
        icon: 'sparkles',
        label: t('settings.checkMissingTranslations'),
        onPress: handleCheckMissingTranslations,
      },
      {
        key: 'development-tool',
        icon: 'gearshape.fill',
        label: t('settings.developmentTool'),
        onPress: handleOpenDebugTools,
      },
      {
        key: 'app-variant',
        icon: 'info.circle.fill',
        label: t('settings.appVariant'),
        value: variant ?? t('common.unknown'),
      },
    ],
    [handleCheckMissingTranslations, handleOpenDebugTools, t, variant],
  );

  const contentPaddingBottom = Math.max(insets.bottom, 24) + 24;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }] }>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.headerTitle}>{t('navigation.settings')}</ThemedText>
        </ThemedView>

        <SettingsSection isFirst title={t('settings.account')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {accounts.length === 0 ? (
              <CardMessage borderColor={borderColor} message={t('common.noAccounts')} />
            ) : (
              accounts.map((account, index) => {
                const profile = accountProfiles?.[account.did];
                const avatar = profile?.avatar || account.avatar;
                const displayName = profile?.displayName || account.displayName;
                const isCurrent = account.did === currentAccount?.did;

                return (
                  <AccountRow
                    key={account.did}
                    account={account}
                    avatar={avatar}
                    borderColor={borderColor}
                    currentLabel={t('common.current')}
                    displayName={displayName}
                    isCurrent={isCurrent}
                    onRemove={() => handleRemoveAccount(account)}
                    onSwitch={
                      isCurrent
                        ? undefined
                        : () => handleSwitchAccount(account)
                    }
                    removeLabel={t('common.remove')}
                    showDivider
                    switchLabel={t('common.switch')}
                  />
                );
              })
            )}

            <SettingsRow
              borderColor={borderColor}
              description={t('common.connectAnotherAccount')}
              icon="plus"
              key="add-account"
              label={t('common.addAccount')}
              onPress={handleAddAccount}
            />
            <SettingsRow
              borderColor={borderColor}
              description={t('common.removeAllConnections')}
              destructive
              icon="xmark.circle.fill"
              key="disconnect-all"
              label={t('common.disconnectAllAccounts')}
              onPress={handleLogout}
              showDivider={false}
            />
          </ThemedView>

          {currentAccount ? (
            <ThemedView style={[styles.sectionCard, { borderColor }]}> 
              <InfoRow borderColor={borderColor} label={t('common.handle')} value={`@${currentAccount.handle}`} />
              <InfoRow
                borderColor={borderColor}
                label="DID"
                monospace
                showDivider={false}
                value={currentAccount.did}
              />
            </ThemedView>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t('settings.preferences')}>
          <ThemedView style={[styles.sectionCard, { borderColor, overflow: 'hidden' }]}> 
            <ThemedView
              style={[styles.cardContent, { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}
            >
              <LanguageSelector />
            </ThemedView>
            <NotificationSettings />
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.support')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {supportRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < supportRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.legal')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {legalRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < legalRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.about')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {aboutRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < aboutRows.length - 1}
                value={item.value}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        {showDevelopmentSection ? (
          <SettingsSection title={t('settings.development')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}> 
              {developmentRows.map((item, index) => (
                <SettingsRow
                  key={item.key}
                  borderColor={borderColor}
                  description={item.description}
                  icon={item.icon}
                  label={item.label}
                  onPress={item.onPress}
                  showDivider={index < developmentRows.length - 1}
                  value={item.value}
                />
              ))}
            </ThemedView>
          </SettingsSection>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 48,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    marginTop: 32,
  },
  firstSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.65,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowLabelDestructive: {
    color: '#DC2626',
  },
  rowDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    maxWidth: 140,
  },
  cardMessage: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cardMessageText: {
    fontSize: 15,
    opacity: 0.7,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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

