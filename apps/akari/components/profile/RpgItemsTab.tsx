import { Image } from '@/components/Image';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { buildRpgItemBlobUrl, pickRpgItemImageCid, type RpgItemRecord } from '@/bluesky-api';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { RpgItemDetailModal } from '@/components/RpgItemDetailModal';
import { ThemedText } from '@/components/ThemedText';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useDialogManager } from '@/contexts/DialogContext';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { useRpgInventory } from '@/hooks/queries/useRpgInventory';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabContentProps } from '@/components/profile/types';

type RpgItemsTabProps = ProfileTabContentProps & {
  handle: string;
};

type ItemRow = {
  __row: true;
  key: string;
  left: RpgItemRecord;
  right?: RpgItemRecord;
};

type ItemTileProps = {
  item: RpgItemRecord | undefined;
  pdsUrl: string | undefined;
  tileBg: string;
  badgeBg: string;
  badgeText: string;
  titleColor: string;
  onPress: (item: RpgItemRecord) => void;
};

function RpgItemTile({ item, pdsUrl, tileBg, badgeBg, badgeText, titleColor, onPress }: ItemTileProps) {
  if (!item) {
    return <View style={[styles.tile, styles.tilePlaceholder]} />;
  }
  const itemDid = item.uri.split('/')[2];
  const cid = pickRpgItemImageCid(item);
  const imageUrl = pdsUrl && itemDid && cid ? buildRpgItemBlobUrl(pdsUrl, itemDid, cid) : null;
  const kindLabel = item.value.kind ?? 'layer';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tileBg },
        pressed && { opacity: activeOpacity.subtle },
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.value.title}
    >
      <View style={styles.tileImageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.tileImage} contentFit="contain" />
        ) : null}
      </View>
      <View style={styles.tileMeta}>
        <ThemedText style={[styles.tileTitle, { color: titleColor }]} numberOfLines={2}>
          {item.value.title}
        </ThemedText>
        <View style={[styles.kindBadge, { backgroundColor: badgeBg }]}>
          <ThemedText style={[styles.kindBadgeText, { color: badgeText }]}>
            {kindLabel}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export function RpgItemsTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: RpgItemsTabProps) {
  const { t } = useTranslation();
  const tileBg = useThemeColor({ light: '#f3f4f6', dark: '#1f2326' }, 'background');
  const titleColor = useThemeColor({}, 'text');
  const badgeBg = useThemeColor({ light: '#EEF2FF', dark: '#1F2937' }, 'background');
  const badgeText = useThemeColor({ light: '#4338CA', dark: '#A5B4FC' }, 'text');

  const { data: pdsUrl } = usePdsUrl(handle);
  const {
    data: items,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useRpgInventory(handle);
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);
  const dialogManager = useDialogManager();

  const rows = useMemo<ItemRow[]>(() => {
    if (!items) return [];
    const out: ItemRow[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];
      out.push({ __row: true, key: `${left.uri}|${right?.uri ?? '∅'}`, left, right });
    }
    return out;
  }, [items]);

  const handleTilePress = useCallback(
    (item: RpgItemRecord) => {
      const id = `rpg-item:${item.uri}`;
      dialogManager.open({
        id,
        component: (
          <RpgItemDetailModal
            item={item}
            pdsUrl={pdsUrl}
            onClose={() => dialogManager.close(id)}
          />
        ),
      });
    },
    [dialogManager, pdsUrl],
  );

  const renderItem = useCallback(
    (row: ItemRow) => (
      <View style={styles.row}>
        <RpgItemTile
          item={row.left}
          pdsUrl={pdsUrl}
          tileBg={tileBg}
          badgeBg={badgeBg}
          badgeText={badgeText}
          titleColor={titleColor}
          onPress={handleTilePress}
        />
        <RpgItemTile
          item={row.right}
          pdsUrl={pdsUrl}
          tileBg={tileBg}
          badgeBg={badgeBg}
          badgeText={badgeText}
          titleColor={titleColor}
          onPress={handleTilePress}
        />
      </View>
    ),
    [handleTilePress, pdsUrl, tileBg, badgeBg, badgeText, titleColor],
  );

  return (
    <ProfileTabFlatList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row: ItemRow) => row.key}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noRpgItems')}
      pinScrollY={pinScrollY}
      isActive={isActive}
      onRefresh={handleRefresh}
      refreshing={isRefetching}
      onScrollY={onScrollY}
      onHeaderHeightChange={onHeaderHeightChange}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: layout.border,
    borderColor: 'transparent',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  tilePlaceholder: {
    backgroundColor: 'transparent',
  },
  tileImageBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileMeta: {
    gap: spacing.xxs,
  },
  tileTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  kindBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
});
