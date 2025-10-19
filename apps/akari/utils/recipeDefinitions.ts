/**
 * Recipe definition mappings from exchange.recipe.defs lexicon
 * Maps token values to human-readable descriptions
 */

// Cooking methods
export const COOKING_METHODS: Record<string, string> = {
  'exchange.recipe.defs#cookingMethodAirFrying': 'Air Frying',
  'exchange.recipe.defs#cookingMethodBaking': 'Baking',
  'exchange.recipe.defs#cookingMethodBroiling': 'Broiling',
  'exchange.recipe.defs#cookingMethodGrilling': 'Grilling',
  'exchange.recipe.defs#cookingMethodFrying': 'Frying',
  'exchange.recipe.defs#cookingMethodRoasting': 'Roasting',
  'exchange.recipe.defs#cookingMethodSauteing': 'Sautéing',
  'exchange.recipe.defs#cookingMethodSteaming': 'Steaming',
  'exchange.recipe.defs#cookingMethodSlowCooking': 'Slow Cooking',
  'exchange.recipe.defs#cookingMethodPressureCooking': 'Pressure Cooking',
  'exchange.recipe.defs#cookingMethodNoCook': 'No Cook',
};

// Recipe categories
export const RECIPE_CATEGORIES: Record<string, string> = {
  'exchange.recipe.defs#categoryAppetizer': 'Appetizer',
  'exchange.recipe.defs#categoryBeverage': 'Beverage',
  'exchange.recipe.defs#categoryBreakfast': 'Breakfast',
  'exchange.recipe.defs#categoryBrunch': 'Brunch',
  'exchange.recipe.defs#categoryCocktail': 'Cocktail',
  'exchange.recipe.defs#categoryDessert': 'Dessert',
  'exchange.recipe.defs#categoryDinner': 'Dinner',
  'exchange.recipe.defs#categoryEntree': 'Entrée',
  'exchange.recipe.defs#categoryGarnish': 'Garnish',
  'exchange.recipe.defs#categoryKidFriendly': 'Kid Friendly',
  'exchange.recipe.defs#categoryLunch': 'Lunch',
  'exchange.recipe.defs#categorySalad': 'Salad',
  'exchange.recipe.defs#categorySide': 'Side Dish',
  'exchange.recipe.defs#categorySnack': 'Snack',
  'exchange.recipe.defs#categorySoup': 'Soup',
};

// Cuisines
export const CUISINES: Record<string, string> = {
  'exchange.recipe.defs#cuisineAfrican': 'African',
  'exchange.recipe.defs#cuisineAmerican': 'American',
  'exchange.recipe.defs#cuisineAustralian': 'Australian',
  'exchange.recipe.defs#cuisineBrazilian': 'Brazilian',
  'exchange.recipe.defs#cuisineBritish': 'British',
  'exchange.recipe.defs#cuisineCaribbean': 'Caribbean',
  'exchange.recipe.defs#cuisineChinese': 'Chinese',
  'exchange.recipe.defs#cuisineCreole': 'Creole',
  'exchange.recipe.defs#cuisineEuropean': 'European',
  'exchange.recipe.defs#cuisineFrench': 'French',
  'exchange.recipe.defs#cuisineGerman': 'German',
  'exchange.recipe.defs#cuisineGreek': 'Greek',
  'exchange.recipe.defs#cuisineIndian': 'Indian',
  'exchange.recipe.defs#cuisineIndonesian': 'Indonesian',
  'exchange.recipe.defs#cuisineItalian': 'Italian',
  'exchange.recipe.defs#cuisineJapanese': 'Japanese',
  'exchange.recipe.defs#cuisineKorean': 'Korean',
  'exchange.recipe.defs#cuisineLebanese': 'Lebanese',
  'exchange.recipe.defs#cuisineMediterranean': 'Mediterranean',
  'exchange.recipe.defs#cuisineMexican': 'Mexican',
  'exchange.recipe.defs#cuisineMiddleEastern': 'Middle Eastern',
  'exchange.recipe.defs#cuisineMoroccan': 'Moroccan',
  'exchange.recipe.defs#cuisinePeruvian': 'Peruvian',
  'exchange.recipe.defs#cuisinePolish': 'Polish',
  'exchange.recipe.defs#cuisinePortuguese': 'Portuguese',
  'exchange.recipe.defs#cuisineRussian': 'Russian',
  'exchange.recipe.defs#cuisineSpanish': 'Spanish',
  'exchange.recipe.defs#cuisineSouthern': 'Southern',
  'exchange.recipe.defs#cuisineTexan': 'Texan',
  'exchange.recipe.defs#cuisineTexMex': 'Tex-Mex',
  'exchange.recipe.defs#cuisineThai': 'Thai',
  'exchange.recipe.defs#cuisineTurkish': 'Turkish',
  'exchange.recipe.defs#cuisineVietnamese': 'Vietnamese',
};

// Dietary restrictions
export const DIETARY_RESTRICTIONS: Record<string, string> = {
  'exchange.recipe.defs#dietLowFat': 'Low Fat',
  'exchange.recipe.defs#dietLowCalorie': 'Low Calorie',
  'exchange.recipe.defs#dietLowCarb': 'Low Carb',
  'exchange.recipe.defs#dietVegetarian': 'Vegetarian',
  'exchange.recipe.defs#dietVegan': 'Vegan',
  'exchange.recipe.defs#dietGlutenFree': 'Gluten Free',
  'exchange.recipe.defs#dietDiabetic': 'Diabetic Friendly',
  'exchange.recipe.defs#dietHalal': 'Halal',
  'exchange.recipe.defs#dietKosher': 'Kosher',
  'exchange.recipe.defs#dietPaleo': 'Paleo',
  'exchange.recipe.defs#dietKeto': 'Keto',
};

// Attribution types
export const ATTRIBUTION_TYPES: Record<string, string> = {
  'exchange.recipe.defs#attributionTypeOriginal': 'Original',
  'exchange.recipe.defs#attributionTypePerson': 'Person',
  'exchange.recipe.defs#attributionTypePublication': 'Publication',
  'exchange.recipe.defs#attributionTypeWebsite': 'Website',
  'exchange.recipe.defs#attributionTypeShow': 'Show',
  'exchange.recipe.defs#attributionTypeProduct': 'Product',
};

// Publication types
export const PUBLICATION_TYPES: Record<string, string> = {
  'exchange.recipe.defs#publicationTypeBook': 'Book',
  'exchange.recipe.defs#publicationTypeMagazine': 'Magazine',
};

// Licenses
export const LICENSES: Record<string, string> = {
  'exchange.recipe.defs#licenseAllRights': 'All Rights Reserved',
  'exchange.recipe.defs#licenseCreativeCommonsBy': 'CC BY 4.0',
  'exchange.recipe.defs#licenseCreativeCommonsBySa': 'CC BY-SA 4.0',
  'exchange.recipe.defs#licenseCreativeCommonsByNc': 'CC BY-NC 4.0',
  'exchange.recipe.defs#licenseCreativeCommonsByNcSa': 'CC BY-NC-SA 4.0',
  'exchange.recipe.defs#licensePublicDomain': 'Public Domain',
};

/**
 * Resolves a recipe definition token to its human-readable description
 */
export function resolveRecipeDefinition(token: string | undefined, type: 'cookingMethod' | 'category' | 'cuisine' | 'diet' | 'attribution' | 'publication' | 'license'): string {
  if (!token) return 'N/A';

  let mapping: Record<string, string>;
  switch (type) {
    case 'cookingMethod':
      mapping = COOKING_METHODS;
      break;
    case 'category':
      mapping = RECIPE_CATEGORIES;
      break;
    case 'cuisine':
      mapping = CUISINES;
      break;
    case 'diet':
      mapping = DIETARY_RESTRICTIONS;
      break;
    case 'attribution':
      mapping = ATTRIBUTION_TYPES;
      break;
    case 'publication':
      mapping = PUBLICATION_TYPES;
      break;
    case 'license':
      mapping = LICENSES;
      break;
    default:
      return token;
  }

  return mapping[token] || token;
}

/**
 * Resolves multiple dietary restriction tokens to human-readable descriptions
 */
export function resolveDietaryRestrictions(tokens: string[] | undefined): string[] {
  if (!tokens || tokens.length === 0) return [];
  return tokens.map(token => resolveRecipeDefinition(token, 'diet'));
}
