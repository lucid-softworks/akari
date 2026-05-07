import { Image } from '@/components/Image';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TmdbSearchPicker, type SelectedMedia } from '@/components/TmdbSearchPicker';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreateReview } from '@/hooks/mutations/useCreateReview';
import { useThemeColor } from '@/hooks/useThemeColor';

type ReviewComposerProps = {
  visible: boolean;
  onClose: () => void;
};

export function ReviewComposer({ visible, onClose }: ReviewComposerProps) {
  const [mediaType, setMediaType] = useState<'movie' | 'tv_show'>('movie');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isRevisit, setIsRevisit] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [tmdbPickerVisible, setTmdbPickerVisible] = useState(false);

  const createReviewMutation = useCreateReview();
  const { showToast } = useToast();
  const { top, bottom } = useSafeAreaInsets();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  const isPostDisabled = !selectedMedia || rating === 0 || createReviewMutation.isPending;

  const resetForm = () => {
    setMediaType('movie');
    setSelectedMedia(null);
    setRating(0);
    setReviewText('');
    setIsRevisit(false);
    setContainsSpoilers(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePostReview = async () => {
    if (!selectedMedia || rating === 0) return;

    try {
      await createReviewMutation.mutateAsync({
        identifiers: {
          tmdbId: selectedMedia.tmdbId,
          imdbId: selectedMedia.imdbId,
        },
        creativeWorkType: selectedMedia.creativeWorkType,
        rating,
        text: reviewText.trim() || undefined,
        title: selectedMedia.title,
        genres: selectedMedia.genres.length > 0 ? selectedMedia.genres : undefined,
        isRevisit: isRevisit || undefined,
        containsSpoilers: containsSpoilers || undefined,
        releaseDate: selectedMedia.releaseYear ? `${selectedMedia.releaseYear}-01-01` : undefined,
        posterUrl: selectedMedia.posterUrl ?? undefined,
      });

      showToast({
        type: 'success',
        title: 'Review posted',
        message: `Your review of "${selectedMedia.title}" has been posted.`,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create review:', error);
      Alert.alert('Error', 'Failed to post review. Please try again.');
    }
  };

  const handleMediaSelect = (media: SelectedMedia) => {
    setSelectedMedia(media);
  };

  const handleMediaTypeChange = (type: 'movie' | 'tv_show') => {
    setMediaType(type);
    setSelectedMedia(null);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          activeOpacity={activeOpacity.strong}
          style={styles.starButton}
        >
          <IconSymbol
            name={i <= rating ? 'star.fill' : 'star'}
            size={28}
            color={i <= rating ? '#FFB800' : iconColor}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: borderColor,
                paddingTop: Platform.OS === 'android' ? top + spacing.sm : spacing.lg,
              },
            ]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>Cancel</ThemedText>
            </TouchableOpacity>

            <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
              New Review
            </ThemedText>

            <TouchableOpacity
              onPress={handlePostReview}
              style={[
                styles.postButton,
                isPostDisabled ? styles.postButtonDisabled : styles.postButtonEnabled,
                { backgroundColor: isPostDisabled ? borderColor : tintColor },
              ]}
              disabled={isPostDisabled}
            >
              <ThemedText style={[styles.postButtonText, { color: isPostDisabled ? textColor : '#000000' }]}>
                {createReviewMutation.isPending ? 'Posting...' : 'Post Review'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + spacing.xl }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Media Type Toggle */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: textColor }]}>Type</ThemedText>
              <View style={[styles.toggleRow, { borderColor }]}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonLeft,
                    mediaType === 'movie' && [styles.toggleButtonActive, { backgroundColor: tintColor }],
                    { borderColor },
                  ]}
                  onPress={() => handleMediaTypeChange('movie')}
                  activeOpacity={activeOpacity.subtle}
                >
                  <ThemedText
                    style={[
                      styles.toggleButtonText,
                      { color: mediaType === 'movie' ? '#000000' : textColor },
                    ]}
                  >
                    Movie
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonRight,
                    mediaType === 'tv_show' && [styles.toggleButtonActive, { backgroundColor: tintColor }],
                    { borderColor },
                  ]}
                  onPress={() => handleMediaTypeChange('tv_show')}
                  activeOpacity={activeOpacity.subtle}
                >
                  <ThemedText
                    style={[
                      styles.toggleButtonText,
                      { color: mediaType === 'tv_show' ? '#000000' : textColor },
                    ]}
                  >
                    TV Show
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Media Search */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: textColor }]}>
                {mediaType === 'movie' ? 'Movie' : 'TV Show'}
              </ThemedText>
              {selectedMedia ? (
                <View style={[styles.selectedMediaCard, { borderColor }]}>
                  <View style={styles.selectedMediaContent}>
                    {selectedMedia.posterUrl ? (
                      <Image
                        source={{ uri: selectedMedia.posterUrl }}
                        style={styles.selectedPoster}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.selectedPoster, styles.posterPlaceholder, { backgroundColor: borderColor }]}>
                        <IconSymbol name="photo" size={24} color={iconColor} />
                      </View>
                    )}
                    <View style={styles.selectedMediaInfo}>
                      <ThemedText style={[styles.selectedMediaTitle, { color: textColor }]} numberOfLines={2}>
                        {selectedMedia.title}
                      </ThemedText>
                      {selectedMedia.releaseYear ? (
                        <ThemedText style={[styles.selectedMediaYear, { color: iconColor }]}>
                          {selectedMedia.releaseYear}
                        </ThemedText>
                      ) : null}
                      {selectedMedia.genres.length > 0 ? (
                        <ThemedText style={[styles.selectedMediaGenres, { color: iconColor }]} numberOfLines={1}>
                          {selectedMedia.genres.join(', ')}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTmdbPickerVisible(true)}
                    style={[styles.changeButton, { borderColor }]}
                    activeOpacity={activeOpacity.subtle}
                  >
                    <ThemedText style={[styles.changeButtonText, { color: tintColor }]}>Change</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.searchButton, { borderColor }]}
                  onPress={() => setTmdbPickerVisible(true)}
                  activeOpacity={activeOpacity.subtle}
                >
                  <IconSymbol name="magnifyingglass" size={18} color={iconColor} />
                  <ThemedText style={[styles.searchButtonText, { color: iconColor }]}>
                    {mediaType === 'movie' ? 'Search for a movie...' : 'Search for a TV show...'}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: textColor }]}>
                Rating {rating > 0 ? `(${rating}/10)` : ''}
              </ThemedText>
              <View style={styles.starsRow}>{renderStars()}</View>
            </View>

            {/* Review Text */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: textColor }]}>Review</ThemedText>
              <TextInput
                style={[
                  styles.reviewInput,
                  {
                    color: textColor,
                    borderColor,
                  },
                  Platform.OS === 'web' && { outline: 'none' },
                ]}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Write your review... (optional)"
                placeholderTextColor={iconColor}
                multiline
                textAlignVertical="top"
                selectionColor={tintColor}
                cursorColor={tintColor}
              />
            </View>

            {/* Toggles */}
            <View style={styles.section}>
              <View style={[styles.toggleItem, { borderColor }]}>
                <ThemedText style={[styles.toggleLabel, { color: textColor }]}>This is a revisit</ThemedText>
                <Switch
                  value={isRevisit}
                  onValueChange={setIsRevisit}
                  trackColor={{ false: borderColor, true: tintColor }}
                  thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                />
              </View>
              <View style={[styles.toggleItem, styles.toggleItemLast, { borderColor }]}>
                <ThemedText style={[styles.toggleLabel, { color: textColor }]}>Contains spoilers</ThemedText>
                <Switch
                  value={containsSpoilers}
                  onValueChange={setContainsSpoilers}
                  trackColor={{ false: borderColor, true: tintColor }}
                  thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* TMDB Search Picker */}
        <TmdbSearchPicker
          visible={tmdbPickerVisible}
          onClose={() => setTmdbPickerVisible(false)}
          onSelect={handleMediaSelect}
          mediaType={mediaType}
        />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
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
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonEnabled: {},
  postButtonDisabled: {
    opacity: opacity.disabled,
  },
  postButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  // Media type toggle
  toggleRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: layout.border,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonLeft: {
    borderRightWidth: layout.hairline,
  },
  toggleButtonRight: {
    borderLeftWidth: layout.hairline,
  },
  toggleButtonActive: {},
  toggleButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  // Media search / selected card
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: layout.border,
    borderStyle: 'dashed',
  },
  searchButtonText: {
    fontSize: fontSize.lg,
    marginLeft: spacing.sm,
  },
  selectedMediaCard: {
    borderRadius: radius.md,
    borderWidth: layout.border,
    padding: spacing.md,
  },
  selectedMediaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPoster: {
    width: 50,
    height: 75,
    borderRadius: radius.xs,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMediaInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  selectedMediaTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  selectedMediaYear: {
    fontSize: fontSize.base,
    marginTop: spacing.xxs,
    opacity: opacity.secondary,
  },
  selectedMediaGenres: {
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
    opacity: opacity.tertiary,
  },
  changeButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: layout.border,
  },
  changeButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  // Rating stars
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  starButton: {
    padding: spacing.xxs,
  },
  // Review text
  reviewInput: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: layout.border,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  // Toggles
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  toggleItemLast: {
    borderBottomWidth: 0,
  },
  toggleLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.regular,
  },
});
