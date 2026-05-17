// Pseudo-localization utility
// This provides a simple pseudo-localization transformation for testing UI layouts
// Can be enhanced with the 'pseudo-localization' package when installed

export const pseudoLocalizeString = (text: string): string => {
  // Simple pseudo-localization transformation
  // Wraps text in brackets and adds some character transformations
  return `[${text}]`;
};

// Character mapping for pseudo-localization
const PSEUDO_CHAR_MAP: { [key: string]: string } = {
  a: "à",
  e: "é",
  i: "ì",
  o: "ò",
  u: "ù",
  A: "À",
  E: "É",
  I: "Ì",
  O: "Ò",
  U: "Ù",
  n: "ñ",
  N: "Ñ",
  c: "ç",
  C: "Ç",
};

const PSEUDO_CHAR_REPLACEMENTS: { regex: RegExp; replacement: string }[] = Object.entries(
  PSEUDO_CHAR_MAP,
).map(([original, replacement]) => ({
  regex: new RegExp(original, "g"),
  replacement,
}));

const PSEUDO_PLACEHOLDER_SPLIT_RE = /(\{\{[^}]+\}\})/;

// Enhanced pseudo-localization with character transformations
export const enhancedPseudoLocalizeString = (text: string): string => {
  // Split the text by {{}} placeholders to preserve them exactly
  const parts = text.split(PSEUDO_PLACEHOLDER_SPLIT_RE);

  const result = parts
    .map((part, index) => {
      // If this part is a placeholder (odd indices), keep it unchanged
      if (index % 2 === 1) {
        return part;
      }

      // Otherwise, apply pseudo-localization to this part
      let transformed = part;
      for (const { regex, replacement } of PSEUDO_CHAR_REPLACEMENTS) {
        transformed = transformed.replace(regex, replacement);
      }
      return transformed;
    })
    .join("");

  // Add brackets and some extra characters to simulate longer text
  return `[${result}]`;
};

// Transform an object recursively with pseudo-localization
export const pseudoLocalizeObject = (obj: unknown): unknown => {
  if (typeof obj === "string") {
    return enhancedPseudoLocalizeString(obj);
  }
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = pseudoLocalizeObject(value);
    }
    return result;
  }
  return obj;
};
