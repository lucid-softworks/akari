import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { TmdbAPI, type TmdbMovie, type TmdbTvShow } from '@/tmdb-api';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim() ?? '';
const tmdbApi = new TmdbAPI(TMDB_API_KEY);

export type SelectedMedia = {
  tmdbId: string;
  imdbId?: string;
  title: string;
  posterUrl: string | null;
  releaseYear: string;
  genres: string[];
  creativeWorkType: 'movie' | 'tv_show';
};

type TmdbSearchPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (media: SelectedMedia) => void;
  mediaType: 'movie' | 'tv_show';
};

export function TmdbSearchPicker({ visible, onClose, onSelect, mediaType }: TmdbSearchPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<(TmdbMovie | TmdbTvShow)[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  // Reset state when modal opens/closes or media type changes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setResults([]);
      setLoading(false);
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        if (mediaType === 'movie') {
          const response = await tmdbApi.searchMovies(searchQuery);
          setResults(response.results);
        } else {
          const response = await tmdbApi.searchTvShows(searchQuery);
          setResults(response.results);
        }
      } catch (error) {
        console.error('TMDB search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, mediaType]);

  const handleSelect = useCallback(
    async (item: TmdbMovie | TmdbTvShow) => {
      try {
        let selectedMedia: SelectedMedia;

        if (mediaType === 'movie') {
          const details = await tmdbApi.getMovieDetails(item.id);
          selectedMedia = {
            tmdbId: String(item.id),
            imdbId: details.imdb_id ?? undefined,
            title: (item as TmdbMovie).title,
            posterUrl: TmdbAPI.posterUrl(item.poster_path),
            releaseYear: (item as TmdbMovie).release_date?.substring(0, 4) ?? '',
            genres: details.genres.map((g: { id: number; name: string }) => g.name),
            creativeWorkType: 'movie',
          };
        } else {
          const details = await tmdbApi.getTvShowDetails(item.id);
          selectedMedia = {
            tmdbId: String(item.id),
            imdbId: details.external_ids?.imdb_id ?? undefined,
            title: (item as TmdbTvShow).name,
            posterUrl: TmdbAPI.posterUrl(item.poster_path),
            releaseYear: (item as TmdbTvShow).first_air_date?.substring(0, 4) ?? '',
            genres: details.genres.map((g: { id: number; name: string }) => g.name),
            creativeWorkType: 'tv_show',
          };
        }

        onSelect(selectedMedia);
        onClose();
      } catch (error) {
        console.error('Failed to fetch media details:', error);
      }
    },
    [mediaType, onSelect, onClose],
  );

  const getTitle = (item: TmdbMovie | TmdbTvShow): string =>
    mediaType === 'movie' ? (item as TmdbMovie).title : (item as TmdbTvShow).name;

  const getYear = (item: TmdbMovie | TmdbTvShow): string => {
    const date = mediaType === 'movie' ? (item as TmdbMovie).release_date : (item as TmdbTvShow).first_air_date;
    return date?.substring(0, 4) ?? '';
  };

  const renderItem = useCallback(
    ({ item }: { item: TmdbMovie | TmdbTvShow }) => {
      const posterUrl = TmdbAPI.posterUrl(item.poster_path);
      const title = getTitle(item);
      const year = getYear(item);

      return (
        <TouchableOpacity
          style={[styles.resultItem, { borderBottomColor: borderColor }]}
          onPress={() => handleSelect(item)}
          activeOpacity={activeOpacity.subtle}
        >
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder, { backgroundColor: borderColor }]}>
              <IconSymbol name="photo" size={24} color={iconColor} />
            </View>
          )}
          <View style={styles.resultInfo}>
            <ThemedText style={[styles.resultTitle, { color: textColor }]} numberOfLines={2}>
              {title}
            </ThemedText>
            {year ? (
              <ThemedText style={[styles.resultYear, { color: iconColor }]}>{year}</ThemedText>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [borderColor, iconColor, textColor, handleSelect, mediaType],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <IconSymbol name="magnifyingglass" size={48} color={iconColor} />
          <ThemedText style={[styles.emptyText, { color: iconColor }]}>
            {mediaType === 'movie' ? 'Search for a movie...' : 'Search for a TV show...'}
          </ThemedText>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="photo" size={48} color={iconColor} />
        <ThemedText style={[styles.emptyText, { color: iconColor }]}>No results found</ThemedText>
      </View>
    );
  }, [loading, searchQuery, iconColor, mediaType]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <IconSymbol name="xmark" size={20} color={iconColor} />
          </TouchableOpacity>

          <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
            {mediaType === 'movie' ? 'Search Movies' : 'Search TV Shows'}
          </ThemedText>

          <View style={styles.headerSpacer} />
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { borderBottomColor: borderColor }]}>
          <View style={[styles.searchInputContainer, { backgroundColor, borderColor }]}>
            <IconSymbol name="magnifyingglass" size={16} color={iconColor} style={styles.searchIcon} />
            <TextInput
              style={[
                styles.searchInput,
                { color: textColor },
                Platform.OS === 'web' && { outline: 'none' },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={mediaType === 'movie' ? 'Search movies...' : 'Search TV shows...'}
              placeholderTextColor={iconColor}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {loading && <ActivityIndicator size="small" color={tintColor} style={styles.searchLoading} />}
          </View>
        </View>

        {/* Results */}
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
        />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: 36,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: layout.hairline,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: layout.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.lg,
    paddingVertical: spacing.xs,
  },
  searchLoading: {
    marginLeft: spacing.sm,
  },
  resultsList: {
    paddingVertical: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: radius.xs,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  resultTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  resultYear: {
    fontSize: fontSize.base,
    marginTop: spacing.xxs,
    opacity: opacity.secondary,
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
