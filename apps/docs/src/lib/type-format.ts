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
