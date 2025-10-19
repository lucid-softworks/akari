import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { BlueskyRecipeAttribution, BlueskyRecipeRecord } from '@/bluesky-api';
import { RecipeModal } from '@/components/RecipeModal';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useAuthorRecipes } from '@/hooks/queries/useAuthorRecipes';
import { usePdsUrlFromDid } from '@/hooks/queries/usePdsUrl';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { resolveRecipeDefinition } from '@/utils/recipeDefinitions';

function formatTime(timeString: string) {
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
}

const ESTIMATED_RECIPE_CARD_HEIGHT = 200;

type RecipesTabProps = {
  handle: string;
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

type RecipeItemProps = {
  recipe: BlueskyRecipeRecord;
  onPress: () => void;
};

function RecipeItem({ recipe, onPress }: RecipeItemProps) {
  const iconColor = useThemeColor({}, 'icon');
  const accentColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const metaTextColor = useThemeColor({ light: '#4f5b62', dark: '#9BA1A6' }, 'icon');
  const pillBackground = useThemeColor(
    { light: 'rgba(10, 126, 164, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
    'background',
  );

  // Get recipe image
  const recipeImage = recipe.value.embed?.images?.[0];
  const did = recipe.uri.split('/')[2];
  const { data: pdsUrl } = usePdsUrlFromDid(did);
  const imageUrl =
    recipeImage && pdsUrl ? `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${recipeImage.image.ref.$link}` : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedCard style={styles.recipeCard}>
        <View style={styles.headerRow}>
          {imageUrl ? (
            <View style={styles.recipeImageContainer}>
              <Image source={{ uri: imageUrl }} style={styles.recipeImage} contentFit="cover" />
            </View>
          ) : (
            <View style={[styles.recipeIcon, { borderColor }]}>
              <IconSymbol name="fork.knife" size={20} color={accentColor} />
            </View>
          )}
          <View style={styles.headerContent}>
            <ThemedText style={styles.recipeName} numberOfLines={2}>
              {recipe.value.name}
            </ThemedText>
            {recipe.value.text ? (
              <ThemedText style={[styles.recipeDescription, { color: metaTextColor }]} numberOfLines={3}>
                {recipe.value.text}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.categoryPill, { backgroundColor: pillBackground }]}>
            <ThemedText style={[styles.categoryText, { color: metaTextColor }]} numberOfLines={1}>
              {resolveRecipeDefinition(recipe.value.recipeCategory, 'category')}
            </ThemedText>
          </View>

          <View style={styles.metricItem}>
            <IconSymbol name="number.circle.fill" size={18} color={iconColor} />
            <ThemedText style={[styles.metricValue, { color: metaTextColor }]}>{recipe.value.ingredients.length}</ThemedText>
          </View>

          <View style={styles.metricItem}>
            <IconSymbol name="clock" size={18} color={iconColor} />
            <ThemedText style={[styles.metricValue, { color: metaTextColor }]}>
              {formatTime(recipe.value.totalTime || '')}
            </ThemedText>
          </View>

          {recipe.value.recipeYield ? (
            <View style={styles.metricItem}>
              <IconSymbol name="person.2.fill" size={18} color={iconColor} />
              <ThemedText style={[styles.metricValue, { color: metaTextColor }]}>{recipe.value.recipeYield}</ThemedText>
            </View>
          ) : null}
        </View>

        {recipe.value.attribution && getAttributionName(recipe.value.attribution) !== 'Unknown Source' ? (
          <ThemedText style={[styles.recipeSource, { color: accentColor }]} numberOfLines={1} selectable>
            {getAttributionName(recipe.value.attribution)}
          </ThemedText>
        ) : null}
      </ThemedCard>
    </TouchableOpacity>
  );
}

export function RecipesTab({ handle }: RecipesTabProps) {
  const { t } = useTranslation();
  const { data: recipes, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorRecipes(handle);
  const [selectedRecipe, setSelectedRecipe] = useState<BlueskyRecipeRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRecipePress = (recipe: BlueskyRecipeRecord) => {
    setSelectedRecipe(recipe);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedRecipe(null);
  };

  const renderItem = ({ item }: { item: BlueskyRecipeRecord }) => (
    <RecipeItem recipe={item} onPress={() => handleRecipePress(item)} />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  };

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!recipes || recipes.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noRecipes')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <VirtualizedList
        data={recipes}
        renderItem={renderItem}
        keyExtractor={(item) => item.uri}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        estimatedItemSize={ESTIMATED_RECIPE_CARD_HEIGHT}
      />

      <RecipeModal visible={modalVisible} onClose={handleCloseModal} recipe={selectedRecipe} />
    </>
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
  recipeCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recipeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  headerContent: {
    flex: 1,
    gap: 6,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  recipeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  recipeSource: {
    fontSize: 13,
    fontWeight: '500',
  },
});
