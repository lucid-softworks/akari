import { View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { MAX_POST_CHARACTERS } from '@/utils/postComposer/types';

import { styles } from './styles';

type AutoThreadPreviewProps = {
  chunks: string[];
  borderColor: string;
  textColor: string;
  iconColor: string;
};

export function AutoThreadPreview({ chunks, borderColor, textColor, iconColor }: AutoThreadPreviewProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.autoThreadPreview}>
      <ThemedText style={[styles.autoThreadHeader, { color: iconColor }]}>
        {chunks.length <= 1
          ? t('post.autothread.singlePart')
          : t('post.autothread.parts', { count: chunks.length })}
      </ThemedText>
      {chunks.length > 1
        ? chunks.map((chunk, idx) => (
            <View
              // oxlint-disable-next-line react/no-array-index-key, react-doctor/no-array-index-as-key -- chunks are recomputed from text every render and their position IS the part number shown to the user (rendered as "1/N", "2/N")
              key={`autothread-chunk-${idx}`}
              style={[styles.autoThreadChunk, { borderColor }]}
            >
              <ThemedText style={[styles.autoThreadChunkLabel, { color: iconColor }]}>
                {`${idx + 1}/${chunks.length}`}
                <ThemedText
                  style={[
                    styles.autoThreadChunkCount,
                    {
                      color: chunk.length > MAX_POST_CHARACTERS ? '#FF3B30' : iconColor,
                    },
                  ]}
                >
                  {`  ·  ${chunk.length}/${MAX_POST_CHARACTERS}`}
                </ThemedText>
              </ThemedText>
              <ThemedText
                style={[styles.autoThreadChunkText, { color: textColor }]}
                numberOfLines={4}
              >
                {chunk}
              </ThemedText>
            </View>
          ))
        : null}
    </View>
  );
}
