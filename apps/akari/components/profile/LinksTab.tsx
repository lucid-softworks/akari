import { useEffect } from 'react';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLinks } from '@/hooks/queries/useLinks';
import { useFavicon } from '@/hooks/useFavicon';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ProfileTabContentProps } from '@/components/profile/types';

type LinksTabProps = ProfileTabContentProps & {
  handle: string;
};

type LinkItemProps = {
  card: {
    url: string;
    text: string;
    emoji: string;
  };
};

function LinkItem({ card }: LinkItemProps) {
  const borderColor = useThemeColor({}, 'border');
  const metaTextColor = useThemeColor({ light: '#4f5b62', dark: '#9BA1A6' }, 'icon');
  const { faviconUrl, domain } = useFavicon(card.url, card.emoji);

  const handleLinkPress = async () => {
    try {
      await Linking.openURL(card.url);
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  const renderIcon = () => {
    // If emoji is provided, use it
    if (card.emoji && card.emoji.trim()) {
      return <ThemedText style={styles.linkEmoji}>{card.emoji}</ThemedText>;
    }

    // If favicon is available, use it
    if (faviconUrl) {
      return <Image source={{ uri: faviconUrl }} style={styles.favicon} resizeMode="contain" />;
    }

    // Fallback to a default link icon
    return <IconSymbol name="link" size={20} color={metaTextColor} />;
  };

  const linkContent = (
    <ThemedCard style={styles.linkCard}>
      <View style={styles.linkRow}>
        <View style={[styles.linkIcon, { borderColor }]}>{renderIcon()}</View>
        <View style={styles.linkContent}>
          <ThemedText style={styles.linkText} numberOfLines={1}>
            {card.text}
          </ThemedText>
          <ThemedText style={[styles.linkUrl, { color: metaTextColor }]} numberOfLines={1}>
            {domain}
          </ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={metaTextColor} />
      </View>
    </ThemedCard>
  );

  // On web, use a proper anchor tag for native link behavior
  if (Platform.OS === 'web') {
    return (
      <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {linkContent}
      </a>
    );
  }

  // On native, use Pressable
  return <Pressable onPress={handleLinkPress}>{linkContent}</Pressable>;
}

export function LinksTab({ handle, visibleCount = 10 }: LinksTabProps) {
  const { t } = useTranslation();
  const { data: links, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLinks(handle);

  // Flatten all cards from all boards into individual link items
  const allLinks =
    links?.flatMap((board) =>
      board.value.cards.map((card, index) => ({
        ...card,
        id: `${board.uri}-${index}`, // Unique key for each link
      })),
    ) || [];

  // Fetch more pages when visible count approaches data length
  useEffect(() => {
    if (allLinks && visibleCount >= allLinks.length - 3 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [visibleCount, allLinks?.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!allLinks || allLinks.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noLinks')}</ThemedText>
      </ThemedView>
    );
  }

  const visibleLinks = allLinks.slice(0, visibleCount);

  return (
    <View>
      {visibleLinks.map((item) => (
        <LinkItem key={item.id} card={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  linkCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.2s ease',
      ':hover': {
        opacity: 0.8,
      },
    }),
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkEmoji: {
    fontSize: 20,
  },
  favicon: {
    width: 20,
    height: 20,
  },
  linkContent: {
    flex: 1,
    gap: 4,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkUrl: {
    fontSize: 14,
  },
});
