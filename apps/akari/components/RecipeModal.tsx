import { Image } from '@/components/Image';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';

import type { BlueskyRecipeAttribution, BlueskyRecipeRecord } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePdsUrlFromDid } from '@/hooks/queries/usePdsUrl';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { resolveDietaryRestrictions, resolveRecipeDefinition } from '@/utils/recipeDefinitions';

type RecipeModalProps = {
  visible: boolean;
  onClose: () => void;
  recipe: BlueskyRecipeRecord | null;
};

/**
 * Pair each string in a list with a per-render-stable, occurrence-disambiguated
 * key so duplicate entries (e.g. "salt to taste" listed twice in an
 * ingredients list) don't collide as React keys. The occurrence counter lives
 * outside the JSX render loop, so the rendered `key=` never reads a `.map()`
 * index — which keeps `no-array-index-as-key` from flagging legitimate
 * positional disambiguation.
 */
function withStringKeys(prefix: string, items: readonly string[]): { value: string; key: string }[] {
  const seen = new Map<string, number>();
  return items.map((value) => {
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    return { value, key: count === 0 ? `${prefix}-${value}` : `${prefix}-${value}-${count}` };
  });
}

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
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'tint');
  const metaTextColor = useThemeColor({ light: '#4f5b62', dark: '#9BA1A6' }, 'icon');
  const pillBackground = useThemeColor(
    { light: 'rgba(10, 126, 164, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
    'background',
  );


  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Android Modal `presentationStyle='fullScreen'` draws under the status
  // bar; iOS pageSheet auto-respects the safe area. Use `StatusBar.currentHeight`
  // — `useSafeAreaInsets` returns 0 inside a Modal (separate native window).
  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  // Extract DID from recipe URI to resolve the correct PDS (call hook unconditionally)
  const did = recipe?.uri.split('/')[2];
  const { data: pdsUrl } = usePdsUrlFromDid(did);

  // Precompute per-render-stable, occurrence-disambiguated keys for the
  // free-text string lists. These are user-authored, so duplicate entries
  // ("salt to taste" listed twice) are possible — computing the keys out
  // here means the render loop never reads a `.map()` index back.
  const dietEntries = useMemo(
    () =>
      recipe?.value.suitableForDiet
        ? withStringKeys('diet', resolveDietaryRestrictions(recipe.value.suitableForDiet))
        : [],
    [recipe?.value.suitableForDiet],
  );
  const ingredientEntries = useMemo(
    () => (recipe?.value.ingredients ? withStringKeys('ingredient', recipe.value.ingredients) : []),
    [recipe?.value.ingredients],
  );
  const keywordEntries = useMemo(
    () => (recipe?.value.keywords ? withStringKeys('keyword', recipe.value.keywords) : []),
    [recipe?.value.keywords],
  );

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
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
        <ThemedView style={[styles.nativeSheet, { backgroundColor, paddingTop: containerTopPadding }]}>

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

              {dietEntries.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>{t('recipe.dietaryRestrictions')}</ThemedText>
                  <View style={styles.keywordsContainer}>
                    {dietEntries.map(({ value: diet, key }) => (
                      <View key={key} style={[styles.keywordPill, { backgroundColor: pillBackground }]}>
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
                {ingredientEntries.map(({ value: ingredient, key }) => (
                  <View key={key} style={styles.ingredientItem}>
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
                  // oxlint-disable-next-line react/no-array-index-key, react-doctor/no-array-index-as-key -- instructions are ordered steps; their numeric position IS their identity (rendered as "1.", "2.", etc.)
                  <View key={`instruction-${index}-${instruction.slice(0, 24)}`} style={styles.instructionItem}>
                    <ThemedText style={[styles.instructionNumber, { color: accentColor }]}>{index + 1}.</ThemedText>
                    <ThemedText style={styles.instructionText}>{instruction}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Keywords */}
            {keywordEntries.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('recipe.tags')}</ThemedText>
                <View style={styles.keywordsContainer}>
                  {keywordEntries.map(({ value: keyword, key }) => (
                    <View key={key} style={[styles.keywordPill, { backgroundColor: pillBackground }]}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  nativeSheet: {
    flex: 1,
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
