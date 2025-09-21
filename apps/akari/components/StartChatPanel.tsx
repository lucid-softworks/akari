import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Panel } from '@/components/ui/Panel';
import { useDialogManager } from '@/contexts/DialogContext';
import { NEW_CHAT_PANEL_ID } from '@/constants/dialogs';
import { useCreateConversation } from '@/hooks/mutations/useCreateConversation';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import {
  useProfileSearch,
  type ProfileSearchError,
  type ProfileSearchResult,
} from '@/hooks/queries/useProfileSearch';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

import type { CreateConversationError } from '@/hooks/mutations/useCreateConversation';

type StartChatPanelProps = {
  panelId?: string;
};

export function StartChatPanel({ panelId = NEW_CHAT_PANEL_ID }: StartChatPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const dialogManager = useDialogManager();
  const { data: currentAccount } = useCurrentAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);

  const createConversationMutation = useCreateConversation();
  const { data, isFetching, isError, error } = useProfileSearch(searchQuery);

  const filteredProfiles = useMemo(() => {
    const baseProfiles = data?.profiles ?? [];

    if (!currentAccount?.did) {
      return baseProfiles.slice();
    }

    return baseProfiles.filter((profile) => profile.did !== currentAccount.did);
  }, [data?.profiles, currentAccount?.did]);

  useEffect(() => {
    if (selectedProfile && !filteredProfiles.some((profile) => profile.did === selectedProfile.did)) {
      setSelectedProfile(null);
    }
  }, [filteredProfiles, selectedProfile]);

  const hasMinimumQuery = searchQuery.trim().length >= 2;
  const isSubmitting = createConversationMutation.isPending;

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const mutedColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({ light: '#4B5563', dark: '#9CA3AF' }, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const selectedBackground = useThemeColor({ light: '#EFF6FF', dark: '#1E2537' }, 'background');
  const errorColor = '#EF4444';

  const handleDismiss = () => {
    if (isSubmitting) {
      return;
    }

    dialogManager.close(panelId);
  };

  const handleStartChat = async () => {
    if (!selectedProfile) {
      return;
    }

    if (selectedProfile.did === currentAccount?.did) {
      showAlert({
        title: t('common.error'),
        message: t('messages.cannotStartChatWithSelf'),
      });
      return;
    }

    try {
      await createConversationMutation.mutateAsync({ did: selectedProfile.did });
      dialogManager.close(panelId);
      router.push(`/(tabs)/messages/${encodeURIComponent(selectedProfile.handle)}`);
    } catch (mutationError) {
      const createError = mutationError as CreateConversationError | Error;
      const message = 'message' in createError ? createError.message : undefined;

      showAlert({
        title: t('common.error'),
        message: message ?? t('messages.errorStartingChat'),
      });
    }
  };

  const renderResults = () => {
    if (!hasMinimumQuery) {
      return (
        <ThemedText style={[styles.helperText, { color: mutedColor }]}>
          {t('messages.searchMinimumCharacters')}
        </ThemedText>
      );
    }

    if (isError) {
      const searchError = error as ProfileSearchError;
      return (
        <ThemedText style={[styles.helperText, { color: errorColor }]}>
          {searchError.message}
        </ThemedText>
      );
    }

    if (!isFetching && filteredProfiles.length === 0) {
      return (
        <ThemedText style={[styles.helperText, { color: mutedColor }]}>
          {t('search.noUsersFound')}
        </ThemedText>
      );
    }

    return (
      <View>
        {filteredProfiles.map((profile, index) => {
          const isSelected = selectedProfile?.did === profile.did;

          return (
            <TouchableOpacity
              key={profile.did}
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => setSelectedProfile(profile)}
              disabled={isSubmitting}
              style={[
                styles.resultItem,
                index > 0 ? styles.resultItemSpacing : null,
                {
                  borderColor: isSelected ? tintColor : borderColor,
                  backgroundColor: isSelected ? selectedBackground : inputBackground,
                },
              ]}
            >
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: tintColor }]}>
                  <ThemedText style={styles.avatarInitial}>
                    {(profile.displayName || profile.handle).charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}

              <View style={styles.resultInfo}>
                <ThemedText style={[styles.resultDisplayName, { color: textColor }]} numberOfLines={1}>
                  {profile.displayName}
                </ThemedText>
                <ThemedText style={[styles.resultHandle, { color: mutedColor }]} numberOfLines={1}>
                  @{profile.handle}
                </ThemedText>
                {profile.description ? (
                  <ThemedText style={[styles.resultDescription, { color: mutedColor }]} numberOfLines={2}>
                    {profile.description}
                  </ThemedText>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const startChatLabel = isSubmitting ? t('messages.startingChat') : t('messages.startChat');

  return (
    <Panel
      title={t('messages.startNewChat')}
      headerActions={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={handleDismiss}
          disabled={isSubmitting}
          style={[styles.iconButton, isSubmitting ? styles.disabledButton : null]}
        >
          <IconSymbol name="xmark" size={18} color={iconColor} />
        </TouchableOpacity>
      }
      footerActions={
        <View style={styles.footerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleDismiss}
            disabled={isSubmitting}
            style={[styles.secondaryButton, isSubmitting ? styles.disabledButton : null]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: labelColor }]}>
              {t('common.cancel')}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleStartChat}
            disabled={!selectedProfile || isSubmitting}
            style={[
              styles.primaryButton,
              (!selectedProfile || isSubmitting) && styles.disabledPrimaryButton,
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>{startChatLabel}</ThemedText>
          </TouchableOpacity>
        </View>
      }
    >
      <ThemedView>
        <ThemedText style={[styles.description, { color: mutedColor }]}>
          {t('messages.startNewChatDescription')}
        </ThemedText>

        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: labelColor }]}>
            {t('messages.searchInputLabel')}
          </ThemedText>
          <View style={[styles.searchInputContainer, { borderColor, backgroundColor: inputBackground }]}
          >
            <View style={styles.searchIcon}>
              <IconSymbol name="magnifyingglass" size={18} color={iconColor} />
            </View>
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('messages.searchPlaceholder')}
              placeholderTextColor={mutedColor}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              returnKeyType="search"
            />
            {isFetching ? (
              <ActivityIndicator size="small" color={tintColor} style={styles.searchLoading} />
            ) : null}
          </View>

          <View style={styles.resultsWrapper}>{renderResults()}</View>
        </View>
      </ThemedView>
    </Panel>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  fieldGroup: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  searchLoading: {
    marginLeft: 8,
  },
  resultsWrapper: {
    minHeight: 120,
    marginTop: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  resultItemSpacing: {
    marginTop: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultInfo: {
    flex: 1,
  },
  resultDisplayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultHandle: {
    fontSize: 14,
    marginTop: 2,
  },
  resultDescription: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginRight: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledPrimaryButton: {
    opacity: 0.5,
  },
  iconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
});
