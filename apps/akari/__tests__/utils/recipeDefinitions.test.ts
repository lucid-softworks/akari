import { resolveDietaryRestrictions, resolveRecipeDefinition } from '@/utils/recipeDefinitions';

describe('resolveRecipeDefinition', () => {
  it('returns "N/A" when the token is undefined', () => {
    expect(resolveRecipeDefinition(undefined, 'cuisine')).toBe('N/A');
  });

  it('resolves cooking method tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#cookingMethodAirFrying', 'cookingMethod')).toBe('Air Frying');
    expect(resolveRecipeDefinition('exchange.recipe.defs#cookingMethodNoCook', 'cookingMethod')).toBe('No Cook');
  });

  it('resolves category tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#categoryEntree', 'category')).toBe('Entrée');
    expect(resolveRecipeDefinition('exchange.recipe.defs#categorySide', 'category')).toBe('Side Dish');
  });

  it('resolves cuisine tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#cuisineItalian', 'cuisine')).toBe('Italian');
    expect(resolveRecipeDefinition('exchange.recipe.defs#cuisineTexMex', 'cuisine')).toBe('Tex-Mex');
  });

  it('resolves diet tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#dietVegan', 'diet')).toBe('Vegan');
    expect(resolveRecipeDefinition('exchange.recipe.defs#dietDiabetic', 'diet')).toBe('Diabetic Friendly');
  });

  it('resolves attribution tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#attributionTypeOriginal', 'attribution')).toBe('Original');
    expect(resolveRecipeDefinition('exchange.recipe.defs#attributionTypeProduct', 'attribution')).toBe('Product');
  });

  it('resolves publication tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#publicationTypeBook', 'publication')).toBe('Book');
    expect(resolveRecipeDefinition('exchange.recipe.defs#publicationTypeMagazine', 'publication')).toBe('Magazine');
  });

  it('resolves license tokens', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#licensePublicDomain', 'license')).toBe('Public Domain');
    expect(resolveRecipeDefinition('exchange.recipe.defs#licenseCreativeCommonsByNcSa', 'license')).toBe('CC BY-NC-SA 4.0');
  });

  it('returns the raw token when it is not found in the mapping', () => {
    expect(resolveRecipeDefinition('exchange.recipe.defs#unknownToken', 'cuisine')).toBe(
      'exchange.recipe.defs#unknownToken',
    );
  });

  it('returns the raw token for an unrecognized type', () => {
    // @ts-expect-error exercising the default branch with an invalid type
    expect(resolveRecipeDefinition('some-token', 'bogus')).toBe('some-token');
  });
});

describe('resolveDietaryRestrictions', () => {
  it('returns an empty array when tokens is undefined', () => {
    expect(resolveDietaryRestrictions(undefined)).toEqual([]);
  });

  it('returns an empty array when tokens is empty', () => {
    expect(resolveDietaryRestrictions([])).toEqual([]);
  });

  it('resolves each token to its human-readable description', () => {
    expect(
      resolveDietaryRestrictions([
        'exchange.recipe.defs#dietVegan',
        'exchange.recipe.defs#dietGlutenFree',
      ]),
    ).toEqual(['Vegan', 'Gluten Free']);
  });

  it('passes unknown tokens through unchanged', () => {
    expect(resolveDietaryRestrictions(['exchange.recipe.defs#dietUnknown'])).toEqual([
      'exchange.recipe.defs#dietUnknown',
    ]);
  });
});
