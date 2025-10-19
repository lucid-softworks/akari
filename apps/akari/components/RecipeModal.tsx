import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { BlueskyRecipeAttribution, BlueskyRecipeRecord } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePdsUrlFromDid } from '@/hooks/queries/usePdsUrl';
import { useThemeColor } from '@/hooks/useThemeColor';
import { resolveDietaryRestrictions, resolveRecipeDefinition } from '@/utils/recipeDefinitions';

type RecipeModalProps = {
  visible: boolean;
  onClose: () => void;
  recipe: BlueskyRecipeRecord | null;
};

function getAttributionName(attribution: BlueskyRecipeAttribution): string {
  switch (attribution.type) {
    case 'original':
      return 'Original Recipe';
    case 'person':
      return attribution.name;
    case 'publication':
      const publicationType = resolveRecipeDefinition(attribution.publicationType, 'publication');
      return `${attribution.title} by ${attribution.author} (${publicationType})`;
    case 'website':
      return attribution.name;
    case 'show':
      return `${attribution.title} (${attribution.network})`;
    case 'product':
      return `${attribution.brand} - ${attribution.name}`;
    default:
      return 'Unknown Source';
  }
}

export function RecipeModal({ visible, onClose, recipe }: RecipeModalProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'tint');
  const metaTextColor = useThemeColor({ light: '#4f5b62', dark: '#9BA1A6' }, 'icon');
  const pillBackground = useThemeColor(
    { light: 'rgba(10, 126, 164, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
    'background',
  );

  const isMobile = Platform.OS !== 'web';

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Extract DID from recipe URI to resolve the correct PDS (call hook unconditionally)
  const did = recipe?.uri.split('/')[2];
  const { data: pdsUrl } = usePdsUrlFromDid(did);

  if (!recipe) return null;

  const recipeImage = recipe.value.embed?.images?.[0];
  const imageUrl =
    recipeImage && pdsUrl ? `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${recipeImage.image.ref.$link}` : null;

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === 'PT0S') return 'N/A';
    // Basic ISO 8601 duration parsing for common formats
    const match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return timeString;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

    return parts.join(' ') || 'N/A';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, isMobile && styles.mobileOverlay]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ThemedView style={[styles.container, { backgroundColor }, isMobile && styles.mobileContainer]}>
          {/* Mobile drag handle */}
          {isMobile && (
            <View style={styles.dragHandleContainer} accessibilityRole="button" accessibilityLabel="Drag to resize">
              <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />
            </View>
          )}

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close recipe"
            >
              <IconSymbol name="xmark" size={24} color={textColor} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>{t('recipe.title')}</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Recipe Image */}
            {imageUrl && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.recipeImage}
                  contentFit="cover"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  placeholder={require('@/assets/images/partial-react-logo.png')}
                />
                {!imageLoaded && !imageError && (
                  <View style={styles.imagePlaceholder}>
                    <IconSymbol name="photo" size={48} color={metaTextColor} />
                  </View>
                )}
              </View>
            )}

            {/* Recipe Title */}
            <View style={styles.titleSection}>
              <ThemedText style={styles.recipeTitle}>{recipe.value.name}</ThemedText>
              {recipe.value.text && (
                <ThemedText style={[styles.recipeDescription, { color: metaTextColor }]}>{recipe.value.text}</ThemedText>
              )}
            </View>

            {/* Recipe Meta */}
            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <IconSymbol name="clock" size={16} color={accentColor} />
                  <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.time')}</ThemedText>
                  <ThemedText style={styles.metaValue}>{formatTime(recipe.value.totalTime || '')}</ThemedText>
                </View>

                {recipe.value.recipeYield && (
                  <View style={styles.metaItem}>
                    <IconSymbol name="person.2" size={16} color={accentColor} />
                    <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.servings')}</ThemedText>
                    <ThemedText style={styles.metaValue}>{recipe.value.recipeYield}</ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <IconSymbol name="tag" size={16} color={accentColor} />
                  <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.category')}</ThemedText>
                  <ThemedText style={styles.metaValue}>
                    {resolveRecipeDefinition(recipe.value.recipeCategory, 'category')}
                  </ThemedText>
                </View>

                <View style={styles.metaItem}>
                  <IconSymbol name="list.bullet" size={16} color={accentColor} />
                  <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.ingredients')}</ThemedText>
                  <ThemedText style={styles.metaValue}>{recipe.value.ingredients.length}</ThemedText>
                </View>
              </View>

              {(recipe.value.recipeCuisine || recipe.value.cookingMethod) && (
                <View style={styles.metaRow}>
                  {recipe.value.recipeCuisine && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="globe" size={16} color={accentColor} />
                      <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.cuisine')}</ThemedText>
                      <ThemedText style={styles.metaValue}>
                        {resolveRecipeDefinition(recipe.value.recipeCuisine, 'cuisine')}
                      </ThemedText>
                    </View>
                  )}

                  {recipe.value.cookingMethod && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="flame" size={16} color={accentColor} />
                      <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.method')}</ThemedText>
                      <ThemedText style={styles.metaValue}>
                        {resolveRecipeDefinition(recipe.value.cookingMethod, 'cookingMethod')}
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}

              {recipe.value.nutrition && (
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="heart" size={16} color={accentColor} />
                    <ThemedText style={[styles.metaLabel, { color: metaTextColor }]}>{t('recipe.calories')}</ThemedText>
                    <ThemedText style={styles.metaValue}>{recipe.value.nutrition.calories || 'N/A'}</ThemedText>
                  </View>
                </View>
              )}

              {recipe.value.suitableForDiet && recipe.value.suitableForDiet.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>{t('recipe.dietaryRestrictions')}</ThemedText>
                  <View style={styles.keywordsContainer}>
                    {resolveDietaryRestrictions(recipe.value.suitableForDiet).map((diet, index) => (
                      <View key={index} style={[styles.keywordPill, { backgroundColor: pillBackground }]}>
                        <ThemedText style={[styles.keywordText, { color: metaTextColor }]}>{diet}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Ingredients */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>{t('recipe.ingredients')}</ThemedText>
              <View style={styles.ingredientsList}>
                {recipe.value.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <View style={[styles.ingredientBullet, { backgroundColor: accentColor }]} />
                    <ThemedText style={styles.ingredientText}>{ingredient}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>{t('recipe.instructions')}</ThemedText>
              <View style={styles.instructionsList}>
                {recipe.value.instructions.map((instruction, index) => (
                  <View key={`instruction-${index}`} style={styles.instructionItem}>
                    <ThemedText style={[styles.instructionNumber, { color: accentColor }]}>{index + 1}.</ThemedText>
                    <ThemedText style={styles.instructionText}>{instruction}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Keywords */}
            {recipe.value.keywords && recipe.value.keywords.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('recipe.tags')}</ThemedText>
                <View style={styles.keywordsContainer}>
                  {recipe.value.keywords.map((keyword, index) => (
                    <View key={index} style={[styles.keywordPill, { backgroundColor: pillBackground }]}>
                      <ThemedText style={[styles.keywordText, { color: metaTextColor }]}>{keyword}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Attribution */}
            {recipe.value.attribution && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('recipe.source')}</ThemedText>
                <Pressable
                  style={styles.attributionContainer}
                  onPress={() => {
                    // TODO: Open external link
                    const url = 'url' in recipe.value.attribution! ? recipe.value.attribution.url : undefined;
                    console.log('Open source:', url);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open source: ${getAttributionName(recipe.value.attribution)}`}
                >
                  <IconSymbol name="link" size={16} color={accentColor} />
                  <ThemedText style={[styles.attributionText, { color: accentColor }]}>
                    {getAttributionName(recipe.value.attribution)}
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {/* Bottom padding for safe area */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mobileOverlay: {
    justifyContent: 'flex-end',
    padding: 0,
  },
  container: {
    flex: 1,
    maxHeight: '90%',
    maxWidth: 600,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  mobileContainer: {
    maxHeight: '90%',
    maxWidth: '100%',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  titleSection: {
    padding: 20,
    paddingBottom: 16,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  metaSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  ingredientText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 2,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  attributionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  attributionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
