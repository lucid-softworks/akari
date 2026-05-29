import { Image } from '@/components/Image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { TenorGif } from '@/tenor-api';
import { tenorApi } from '@/utils/tenor';

type GifPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gif: { uri: string; alt: string; mimeType: string; tenorId?: string }) => void;
};

const ESTIMATED_GIF_ITEM_SIZE = 140;

export function GifPicker({ visible, onClose, onSelectGif }: GifPickerProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const nextPosRef = useRef<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const { showToast } = useToast();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  const showGifErrorToast = useCallback(() => {
    showToast({
      id: 'gif-error',
      type: 'error',
      title: t('gif.addGif'),
      message: t('gif.apiError'),
    });
  }, [showToast, t]);

  const loadTrendingGifs = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await tenorApi.getTrendingGifs(20);
      setGifs(response.results);
      nextPosRef.current = response.next;
      setHasMore(!!response.next);
    } catch (error) {
      console.error('Failed to load trending GIFs:', error);
      // Show empty state with error message
      setGifs([]);
      setHasMore(false);
      showGifErrorToast();
    } finally {
      setLoading(false);
    }
  }, [loading, showGifErrorToast]);

  // Load trending GIFs on mount
  useEffect(() => {
    if (visible) {
      loadTrendingGifs();
    }
  }, [visible, loadTrendingGifs]);

  const searchGifs = useCallback(
    async (query: string, isNewSearch = false) => {
      if (!query.trim()) {
        if (isNewSearch) {
          loadTrendingGifs();
        }
        return;
      }

      if (searchLoading) return;

      setSearchLoading(true);
      try {
        const response = await tenorApi.searchGifs(query, 20);
        setGifs(response.results);
        nextPosRef.current = response.next;
        setHasMore(!!response.next);
      } catch (error) {
        console.error('Failed to search GIFs:', error);
        // Show empty state with error message
        setGifs([]);
        setHasMore(false);
        showGifErrorToast();
      } finally {
        setSearchLoading(false);
      }
    },
    [searchLoading, loadTrendingGifs, showGifErrorToast],
  );

  const loadMoreGifs = useCallback(async () => {
    const cursor = nextPosRef.current;
    if (!hasMore || loading || searchLoading || !cursor) return;

    const currentLoading = searchQuery.trim() ? searchLoading : loading;
    if (currentLoading) return;

    if (searchQuery.trim()) {
      setSearchLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const response = searchQuery.trim()
        ? await tenorApi.searchGifs(searchQuery, 20, cursor)
        : await tenorApi.getTrendingGifs(20, cursor);

      setGifs((prev) => [...prev, ...response.results]);
      nextPosRef.current = response.next;
      setHasMore(!!response.next);
    } catch (error) {
      console.error('Failed to load more GIFs:', error);
      showGifErrorToast();
    } finally {
      if (searchQuery.trim()) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [hasMore, loading, searchLoading, searchQuery, showGifErrorToast]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      searchGifs(query, true);
    },
    [searchGifs],
  );

  const handleSelectGif = useCallback(
    (gif: TenorGif) => {
      const attachedImage = tenorApi.convertGifToAttachedImage(gif);
      onSelectGif(attachedImage);
      onClose();
    },
    [onSelectGif, onClose],
  );

  const renderGifItem = useCallback(
    ({ item }: { item: TenorGif }) => {
      // Use the full-size GIF URL for better preview
      const gifUrl = item.media_formats.gif?.url || item.url; // fallback to the main URL

      if (!gifUrl) {
        return null; // Skip items without valid URLs
      }

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.content_description || item.title || 'GIF'}
          style={({ pressed }) => [styles.gifItem, pressed && { opacity: activeOpacity.subtle }]}
          onPress={() => handleSelectGif(item)}
          
        >
          <Image
            source={{ uri: gifUrl }}
            style={styles.gifImage}
            contentFit="cover"
          />
        </Pressable>
      );
    },
    [handleSelectGif],
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={tintColor} />
        <ThemedText style={[styles.loadingText, { color: iconColor }]}>{t('gif.loadingMore')}</ThemedText>
      </View>
    );
  }, [hasMore, tintColor, iconColor, t]);

  const renderEmpty = useCallback(() => {
    if (loading || searchLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="photo" size={48} color={iconColor} />
        <ThemedText style={[styles.emptyText, { color: iconColor }]}>
          {searchQuery.trim() ? t('gif.noResults') : t('gif.noTrending')}
        </ThemedText>
        {gifs.length === 0 && !loading && !searchLoading && (
          <ThemedText style={[styles.emptyText, { color: iconColor, fontSize: fontSize.base, marginTop: spacing.sm }]}>
            {t('gif.apiError')}
          </ThemedText>
        )}
      </View>
    );
  }, [loading, searchLoading, searchQuery, iconColor, t, gifs.length]);

  const isWeb = Platform.OS === 'web';
  const nativePresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
    Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

  const sheetContent = (
    <ThemedView style={[styles.container, { backgroundColor }, isWeb && styles.webContainer]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}>
          <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
        </Pressable>

        <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
          {t('gif.selectGif')}
        </ThemedText>

        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { borderBottomColor: borderColor }]}>
        <Input
          variant="filled"
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder={t('gif.searchPlaceholder')}
          placeholderTextColor={iconColor}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          prefix={<IconSymbol name="magnifyingglass" size={16} color={iconColor} />}
          suffix={searchLoading ? <ActivityIndicator size="small" color={tintColor} /> : null}
        />
      </View>

      {/* GIF Grid */}
      <VirtualizedList
        data={gifs}
        renderItem={renderGifItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gifList}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreGifs}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        estimatedItemSize={ESTIMATED_GIF_ITEM_SIZE}
      />
    </ThemedView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={nativePresentationStyle}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      {isWeb ? <ThemedView style={styles.overlay}>{sheetContent}</ThemedView> : sheetContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  webContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: layout.hairline,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  headerButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: layout.hairline,
  },
  gifList: {
    padding: 10,
  },
  gifItem: {
    flex: 1,
    margin: 5,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    aspectRatio: 1,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: fontSize.lg,
    textAlign: 'center',
    opacity: opacity.secondary,
  },
});
