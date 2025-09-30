import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ExternalLink } from '@/components/ExternalLink';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import {
  type LeafletDocumentBlock,
  type LeafletDocumentListItem,
  type LeafletListItem,
  useLeafletDocuments,
} from '@/hooks/queries/useLeafletDocuments';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type LeafletsTabProps = {
  did: string;
};

const ESTIMATED_LEAFLET_CARD_HEIGHT = 260;

function LeafletList({ items }: { items: LeafletListItem[] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ThemedView style={styles.listContainer}>
      {items.map((item, index) => {
        if (!item.content?.plaintext) {
          return null;
        }

        return (
          <View key={`${item.content.plaintext}-${index}`} style={styles.listItem}>
            <ThemedText style={styles.listBullet}>•</ThemedText>
            <ThemedText style={styles.listText}>{item.content.plaintext}</ThemedText>
          </View>
        );
      })}
    </ThemedView>
  );
}

function LeafletBlockView({ block }: { block: LeafletDocumentBlock }) {
  const content = block.block;
  const type = content.$type;
  const borderAccent = useThemeColor({ light: '#d2d2d7', dark: '#2c2c2e' }, 'background');
  const blockquoteBorderColor = useThemeColor({ light: '#8e8e93', dark: '#636366' }, 'text');
  const inlineColor = useThemeColor({ light: '#6e6e73', dark: '#8e8e93' }, 'text');

  if (!type) {
    return null;
  }

  if (type === 'pub.leaflet.blocks.text') {
    if (!content.plaintext) {
      return null;
    }

    return <ThemedText style={styles.paragraph}>{content.plaintext}</ThemedText>;
  }

  if (type === 'pub.leaflet.blocks.header') {
    return content.plaintext ? (
      <ThemedText style={styles.heading}>{content.plaintext}</ThemedText>
    ) : null;
  }

  if (type === 'pub.leaflet.blocks.blockquote') {
    return content.plaintext ? (
      <ThemedText style={[styles.blockquote, { borderLeftColor: blockquoteBorderColor }]}>
        {content.plaintext}
      </ThemedText>
    ) : null;
  }

  if (type === 'pub.leaflet.blocks.website') {
    return (
      <ThemedView style={[styles.linkCard, { borderColor: borderAccent }]}>
        {content.title ? <ThemedText style={styles.linkTitle}>{content.title}</ThemedText> : null}
        {content.description ? (
          <ThemedText style={styles.linkDescription}>{content.description}</ThemedText>
        ) : null}
        {content.src ? (
          <ExternalLink href={content.src}>
            <ThemedText style={[styles.linkUrl, { color: inlineColor }]}>{content.src}</ThemedText>
          </ExternalLink>
        ) : null}
      </ThemedView>
    );
  }

  if (type === 'pub.leaflet.blocks.bskyPost') {
    const uri = content.postRef?.uri;
    return uri ? <ThemedText style={[styles.inlineMeta, { color: inlineColor }]}>{uri}</ThemedText> : null;
  }

  if (type === 'pub.leaflet.blocks.unorderedList') {
    return <LeafletList items={content.children ?? []} />;
  }

  return null;
}

function LeafletDocumentItem({ document }: { document: LeafletDocumentListItem }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e5ea', dark: '#2c2c2e' }, 'background');
  const secondaryTextColor = useThemeColor({ light: '#6e6e73', dark: '#8e8e93' }, 'text');

  const description = document.value?.description;
  const title = document.value?.title;
  const publishedAt = document.value?.publishedAt ? formatRelativeTime(document.value.publishedAt) : undefined;
  const blocks = document.value?.pages?.flatMap((page) => page.blocks ?? []) ?? [];

  return (
    <ThemedView style={[styles.leafletCard, { backgroundColor, borderColor }]}> 
      {title ? <ThemedText style={styles.title}>{title}</ThemedText> : null}
      {publishedAt ? (
        <ThemedText style={[styles.meta, { color: secondaryTextColor }]}>{publishedAt}</ThemedText>
      ) : null}
      {description ? (
        <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={isExpanded ? undefined : 3}>
          {description}
        </ThemedText>
      ) : null}

      {isExpanded ? (
        <ThemedView style={styles.fullContent}>
          {blocks.map((block, index) => (
            <LeafletBlockView key={index} block={block} />
          ))}
        </ThemedView>
      ) : null}

      {blocks.length > 0 || description ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? t('profile.collapseLeaflet') : t('profile.expandLeaflet')}
          onPress={() => setIsExpanded((value) => !value)}
          style={styles.expandButton}
        >
          <ThemedText style={styles.expandLabel}>
            {isExpanded ? t('profile.collapseLeaflet') : t('profile.expandLeaflet')}
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </ThemedView>
  );
}

/**
 * Profile tab that surfaces Leaflet publications with expandable full document content.
 * @param did - DID of the profile owner whose Leaflet posts should be displayed.
 */
export function LeafletsTab({ did }: LeafletsTabProps) {
  const { t } = useTranslation();
  const {
    data: documents,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLeafletDocuments(did);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (isError || !documents || documents.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noLeaflets')}</ThemedText>
      </ThemedView>
    );
  }

  const renderItem = ({ item }: { item: LeafletDocumentListItem }) => <LeafletDocumentItem document={item} />;

  const renderFooter = () => {
    if (!isFetchingNextPage) {
      return null;
    }

    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  };

  return (
    <VirtualizedList
      data={documents}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_LEAFLET_CARD_HEIGHT}
    />
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
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  leafletCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  fullContent: {
    gap: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
  },
  blockquote: {
    fontSize: 14,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  linkCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkDescription: {
    fontSize: 14,
  },
  linkUrl: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  inlineMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  listContainer: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  listBullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  expandLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
