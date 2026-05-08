import { Image } from '@/components/Image';
import { useState } from 'react';
import { Modal, Platform, Pressable, StatusBar, StyleSheet, TextInput, View } from 'react-native';

import { spacing, radius, fontSize, fontWeight, opacity, layout } from '@/constants/tokens';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileEditModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (profileData: { displayName: string; description: string; avatar?: string; banner?: string }) => void;
  profile: {
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
  };
  isLoading?: boolean;
};

export function ProfileEditModal({ visible, onClose, onSave, profile, isLoading = false }: ProfileEditModalProps) {
  const { t } = useTranslation();
  // Android Modals with `presentationStyle='fullScreen'` draw under the
  // status bar; iOS pageSheet already respects the safe area. Inside a Modal
  // `useSafeAreaInsets` returns 0 (separate native window, the
  // SafeAreaProvider context doesn't reach), so use `StatusBar.currentHeight`
  // — Android exposes it statically without any provider.
  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');
  const inputBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');

  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [description, setDescription] = useState(profile.description || '');
  const [avatar, setAvatar] = useState(profile.avatar);
  const [banner, setBanner] = useState(profile.banner);

  const handleSave = () => {
    onSave({
      displayName: displayName.trim(),
      description: description.trim(),
      avatar,
      banner,
    });
  };

  const handleCancel = () => {
    // Reset form to original values
    setDisplayName(profile.displayName || '');
    setDescription(profile.description || '');
    setAvatar(profile.avatar);
    setBanner(profile.banner);
    onClose();
  };

  const isFormChanged =
    displayName !== (profile.displayName || '') ||
    description !== (profile.description || '') ||
    avatar !== profile.avatar ||
    banner !== profile.banner;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleCancel}
    >
        <ThemedView style={[styles.container, { backgroundColor, paddingTop: containerTopPadding }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Pressable
              accessibilityRole="button"
              onPress={handleCancel}
              style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
            >
              <ThemedText style={[styles.headerButtonText, { color: '#007AFF' }]}>{t('common.cancel')}</ThemedText>
            </Pressable>

            <ThemedText style={[styles.headerTitle, { color: textColor }]}>{t('profile.editProfile')}</ThemedText>

            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              style={({ pressed }) => [styles.headerButton, !isFormChanged || isLoading ? styles.headerButtonDisabled : null, pressed && { opacity: 0.7 }]}
              disabled={!isFormChanged || isLoading}
            >
              <ThemedText style={[styles.headerButtonText, { color: isFormChanged && !isLoading ? '#007AFF' : '#8E8E93' }]}>
                {isLoading ? t('common.saving') : t('common.save')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Banner Section */}
          <View style={styles.bannerSection}>
            <View style={styles.bannerContainer}>
              {banner ? (
                <Image source={{ uri: banner }} style={styles.bannerImage} contentFit="cover" />
              ) : (
                <View style={[styles.bannerPlaceholder, { backgroundColor: inputBackgroundColor }]}>
                  <ThemedText style={[styles.bannerPlaceholderText, { color: textColor }]}>
                    {t('profile.noBanner')}
                  </ThemedText>
                </View>
              )}
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cameraButton, pressed && { opacity: 0.7 }]} onPress={() => {}}>
                <IconSymbol name="camera" size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: '#007AFF' }]}>
                  <ThemedText style={styles.avatarFallbackText}>{(displayName || 'U')[0].toUpperCase()}</ThemedText>
                </View>
              )}
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cameraButton, pressed && { opacity: 0.7 }]} onPress={() => {}}>
                <IconSymbol name="camera" size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Display Name */}
            <View style={styles.fieldContainer}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>{t('profile.displayName')}</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: inputBackgroundColor,
                    color: textColor,
                    borderColor: borderColor,
                  },
                ]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('profile.displayNamePlaceholder')}
                placeholderTextColor="#8E8E93"
                maxLength={64}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>{t('profile.description')}</ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: inputBackgroundColor,
                    color: textColor,
                    borderColor: borderColor,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('profile.descriptionPlaceholder')}
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                maxLength={256}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  headerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerButtonDisabled: {
    opacity: opacity.tertiary,
  },
  headerButtonText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
  },
  bannerSection: {
    height: 150,
    position: 'relative',
  },
  bannerContainer: {
    flex: 1,
    position: 'relative',
  },
  bannerImage: {
    flex: 1,
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholderText: {
    fontSize: fontSize.lg,
    opacity: 0.6,
  },
  avatarSection: {
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xxxxl,
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    width: layout.avatarLarge,
    height: layout.avatarLarge,
    borderRadius: layout.avatarLarge / 2,
    position: 'relative',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarFallback: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    paddingHorizontal: spacing.xl,
  },
  fieldContainer: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  textInput: {
    height: 44,
    borderWidth: layout.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    borderWidth: layout.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    width: '100%',
  },
});
