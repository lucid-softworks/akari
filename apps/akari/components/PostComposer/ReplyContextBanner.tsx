import { View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';

import { styles } from './styles';

type ReplyContextBannerProps = {
  authorHandle: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  tintColor: string;
};

export function ReplyContextBanner({
  authorHandle,
  borderColor,
  textColor,
  iconColor,
  tintColor,
}: ReplyContextBannerProps) {
  const { t } = useTranslation();

  return (
    <ThemedView style={[styles.replyContext, { borderBottomColor: borderColor }]}>
      <View style={[styles.replyIconContainer, { backgroundColor: borderColor }]}>
        <IconSymbol name="arrowshape.turn.up.left" size={14} color={iconColor} />
      </View>
      <ThemedText style={[styles.replyText, { color: textColor }]}>
        {t('post.replyingTo')}{' '}
        <ThemedText style={[styles.replyAuthor, { color: tintColor }]}>
          @{authorHandle}
        </ThemedText>
      </ThemedText>
    </ThemedView>
  );
}
