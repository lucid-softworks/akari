import { Pressable, TextInput, View } from 'react-native';

import { Image } from '@/components/Image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import type { AttachedImage } from '@/utils/postComposer/types';

import { styles } from './styles';

type ImageAttachmentItemProps = {
  image: AttachedImage;
  onRemove: () => void;
  onUpdateAlt: (alt: string) => void;
  removeTestId?: string;
  textColor: string;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
};

export function ImageAttachmentItem({
  image,
  onRemove,
  onUpdateAlt,
  removeTestId,
  textColor,
  iconColor,
  borderColor,
  backgroundColor,
}: ImageAttachmentItemProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.imageItem}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: image.uri }} style={styles.attachedImage} contentFit="contain" />
        <Pressable
          style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.7 }]}
          onPress={onRemove}
          testID={removeTestId}
        >
          <IconSymbol name="xmark" size={16} color="#ffffff" />
        </Pressable>
      </View>
      <TextInput
        style={[styles.altTextInput, { color: textColor, borderColor, backgroundColor }]}
        value={image.alt}
        onChangeText={onUpdateAlt}
        placeholder={t('post.imageAltTextPlaceholder')}
        placeholderTextColor={iconColor}
        maxLength={1000}
      />
    </View>
  );
}
