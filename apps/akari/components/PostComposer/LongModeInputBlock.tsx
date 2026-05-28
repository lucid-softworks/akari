import { View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslation } from '@/hooks/useTranslation';
import type { AttachedImage, ComposeMode } from '@/utils/postComposer/types';

import { AutoThreadPreview } from './AutoThreadPreview';
import { ImageAttachmentItem } from './ImageAttachmentItem';
import { styles } from './styles';

type LongModeInputBlockProps = {
  mode: Exclude<ComposeMode, 'standard'>;
  longText: string;
  longTitle: string;
  setLongText: (next: string) => void;
  setLongTitle: (next: string) => void;
  onLongTextSelectionChange: (selection: { start: number; end: number }) => void;
  autoThreadChunks: string[];
  attachedImages: AttachedImage[];
  onRemoveImage: (imageIdx: number) => void;
  onUpdateImageAlt: (imageIdx: number, alt: string) => void;
  textColor: string;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  tintColor: string;
};

export function LongModeInputBlock({
  mode,
  longText,
  longTitle,
  setLongText,
  setLongTitle,
  onLongTextSelectionChange,
  autoThreadChunks,
  attachedImages,
  onRemoveImage,
  onUpdateImageAlt,
  textColor,
  iconColor,
  borderColor,
  backgroundColor,
  tintColor,
}: LongModeInputBlockProps) {
  const { t } = useTranslation();
  const isLongform = mode === 'longform';

  return (
    <View style={styles.threadPostBlock}>
      {isLongform ? (
        <View style={[styles.inputContainer, styles.titleInputContainer]}>
          <Input
            containerStyle={[styles.composerCanvasContainer, { borderBottomColor: borderColor }, styles.titleCanvasContainer]}
            inputStyle={[styles.titleInput, { color: textColor }]}
            value={longTitle}
            onChangeText={setLongTitle}
            placeholder={t('post.longform.titlePlaceholder')}
            placeholderTextColor={iconColor}
            autoCapitalize="sentences"
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- composer modal opens specifically to capture the title, user expects the cursor here
            autoFocus
            maxLength={500}
            selectionColor={tintColor}
            cursorColor={tintColor}
            testID="longform-title-input"
          />
        </View>
      ) : null}
      <View style={styles.inputContainer}>
        <Textarea
          containerStyle={styles.composerTextareaContainer}
          inputStyle={[styles.textInput, { color: textColor }]}
          minHeight={220}
          value={longText}
          onChangeText={setLongText}
          onSelectionChange={(e) => onLongTextSelectionChange(e.nativeEvent.selection)}
          placeholder={
            isLongform ? t('post.longform.placeholder') : t('post.autothread.placeholder')
          }
          placeholderTextColor={iconColor}
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- composer modal opens to immediately capture post body text
          autoFocus={!isLongform}
          autoCapitalize="none"
          selectionColor={tintColor}
          cursorColor={tintColor}
          testID={isLongform ? 'longform-input' : 'autothread-input'}
        />
      </View>

      {mode === 'autothread' ? (
        <AutoThreadPreview
          chunks={autoThreadChunks}
          borderColor={borderColor}
          textColor={textColor}
          iconColor={iconColor}
        />
      ) : null}

      {mode === 'autothread' && attachedImages.length > 0 ? (
        <View style={styles.imagesContainer}>
          {attachedImages.map((image, imgIdx) => (
            <ImageAttachmentItem
              // oxlint-disable-next-line react/no-array-index-key -- attached images have no stable id; image.uri can be a freshly-picked file:// uri that's unique enough but the surrounding mutation handlers (onRemoveImage / onUpdateImageAlt) are already keyed by positional index
              key={`autothread-image-${imgIdx}-${image.uri}`}
              image={image}
              onRemove={() => onRemoveImage(imgIdx)}
              onUpdateAlt={(alt) => onUpdateImageAlt(imgIdx, alt)}
              removeTestId={`remove-image-0-${imgIdx}`}
              textColor={textColor}
              iconColor={iconColor}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
