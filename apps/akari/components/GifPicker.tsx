import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tenorApi, TenorGif } from '@/utils/tenor';

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gif: { uri: string; alt: string; mimeType: string; tenorId?: string }) => void;
}

export function GifPicker({ visible, onClose, onSelectGif }: GifPickerProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [nextPos, setNextPos] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const inputBackgroundColor = useThemeColor({}, 'background');

  // Load trending GIFs on mount
  useEffect(() => {
    if (visible) {
      loadTrendingGifs();
    }
  }, [visible]);

  const loadTrendingGifs = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await tenorApi.getTrendingGifs(20);
      setGifs(response.results);
      setNextPos(response.next);
      setHasMore(!!response.next);
    } catch (error) {
      console.error('Failed to load trending GIFs:', error);
      // Show empty state with error message
      setGifs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading]);

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
        setNextPos(response.next);
        setHasMore(!!response.next);
      } catch (error) {
        console.error('Failed to search GIFs:', error);
        // Show empty state with error message
        setGifs([]);
        setHasMore(false);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchLoading, loadTrendingGifs],
  );

  const loadMoreGifs = useCallback(async () => {
    if (!hasMore || loading || searchLoading || !nextPos) return;

    const currentLoading = searchQuery.trim() ? searchLoading : loading;
    if (currentLoading) return;

    if (searchQuery.trim()) {
      setSearchLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const response = searchQuery.trim()
        ? await tenorApi.searchGifs(searchQuery, 20, nextPos)
        : await tenorApi.getTrendingGifs(20, nextPos);

      setGifs((prev) => [...prev, ...response.results]);
      setNextPos(response.next);
      setHasMore(!!response.next);
    } catch (error) {
      console.error('Failed to load more GIFs:', error);
    } finally {
      if (searchQuery.trim()) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [hasMore, loading, searchLoading, nextPos, searchQuery]);

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
        <TouchableOpacity style={styles.gifItem} onPress={() => handleSelectGif(item)} activeOpacity={0.8}>
          <Image
            source={{ uri: gifUrl }}
            style={styles.gifImage}
            contentFit="cover"
            placeholder={require('@/assets/images/partial-react-logo.png')}
          />
        </TouchableOpacity>
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
          <ThemedText style={[styles.emptyText, { color: iconColor, fontSize: 14, marginTop: 8 }]}>
            {t('gif.apiError')}
          </ThemedText>
        )}
      </View>
    );
  }, [loading, searchLoading, searchQuery, iconColor, t, gifs.length]);

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <ThemedView style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>

            <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
              {t('gif.selectGif')}
            </ThemedText>

            <View style={styles.headerSpacer} />
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, { borderBottomColor: borderColor }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: inputBackgroundColor, borderColor }]}>
              <IconSymbol name="magnifyingglass" size={16} color={iconColor} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder={t('gif.searchPlaceholder')}
                placeholderTextColor={iconColor}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchLoading && <ActivityIndicator size="small" color={tintColor} style={styles.searchLoading} />}
            </View>
          </View>

          {/* GIF Grid */}
          <FlatList
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
          />
        </ThemedView>
      </ThemedView>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  searchLoading: {
    marginLeft: 8,
  },
  gifList: {
    padding: 10,
  },
  gifItem: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
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
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});
