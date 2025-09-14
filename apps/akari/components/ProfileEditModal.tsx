import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

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
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleCancel}
              style={styles.headerButton}
            >
              <ThemedText style={[styles.headerButtonText, { color: '#007AFF' }]}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>

            <ThemedText style={[styles.headerTitle, { color: textColor }]}>{t('profile.editProfile')}</ThemedText>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleSave}
              style={[styles.headerButton, !isFormChanged || isLoading ? styles.headerButtonDisabled : null]}
              disabled={!isFormChanged || isLoading}
            >
              <ThemedText style={[styles.headerButtonText, { color: isFormChanged && !isLoading ? '#007AFF' : '#8E8E93' }]}>
                {isLoading ? t('common.saving') : t('common.save')}
              </ThemedText>
            </TouchableOpacity>
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
              <TouchableOpacity accessibilityRole="button" style={styles.cameraButton} onPress={() => {}}>
                <IconSymbol name="camera" size={16} color="#ffffff" />
              </TouchableOpacity>
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
              <TouchableOpacity accessibilityRole="button" style={styles.cameraButton} onPress={() => {}}>
                <IconSymbol name="camera" size={16} color="#ffffff" />
              </TouchableOpacity>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '95%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '400',
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
    fontSize: 16,
    opacity: 0.6,
  },
  avatarSection: {
    paddingHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
});
