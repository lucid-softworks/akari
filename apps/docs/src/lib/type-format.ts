import type { TypeReferenceIndex } from '@/types';

const IMPORT_EXPRESSION_PATTERN = /import\((?:'[^']+'|"[^"]+"|`[^`]+`|[^)]+)\)\./g;
const IDENTIFIER_PATTERN = /[A-Za-z_$][A-Za-z0-9_$]*/g;

export const normalizeTypeText = (typeText?: string) => {
  if (!typeText) {
    return undefined;
  }

  return typeText.replace(IMPORT_EXPRESSION_PATTERN, '');
};

export const getTypeVariants = (typeText?: string) => {
  if (!typeText) {
    return [];
  }

  const variants: string[] = [];
  let buffer = '';
  let depth = 0;

  for (let index = 0; index < typeText.length; index += 1) {
    const character = typeText[index];

    if (character === '<' || character === '(' || character === '[' || character === '{') {
      depth += 1;
      buffer += character;
      continue;
    }

    if (character === '>' || character === ')' || character === ']' || character === '}') {
      if (depth > 0) {
        depth -= 1;
      }
      buffer += character;
      continue;
    }

    if (character === '|' && depth === 0) {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        variants.push(trimmed);
      }
      buffer = '';
      continue;
    }

    buffer += character;
  }

  const finalVariant = buffer.trim();
  if (finalVariant.length > 0) {
    variants.push(finalVariant);
  }

  return variants;
};

export const extractTypeIdentifiers = (variant: string) => {
  return variant.match(IDENTIFIER_PATTERN) ?? [];
};

export const resolveTypeAnchor = (variant: string, typeIndex: TypeReferenceIndex) => {
  const direct = typeIndex[variant];
  if (direct) {
    return direct;
  }

  const identifiers = extractTypeIdentifiers(variant);
  for (const identifier of identifiers) {
    const anchor = typeIndex[identifier];
    if (anchor) {
      return anchor;
    }
  }

  return undefined;
};
