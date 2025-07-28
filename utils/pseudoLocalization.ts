// Pseudo-localization utility
// This provides a simple pseudo-localization transformation for testing UI layouts
// Can be enhanced with the 'pseudo-localization' package when installed

export const pseudoLocalizeString = (text: string): string => {
  // Simple pseudo-localization transformation
  // Wraps text in brackets and adds some character transformations
  return `[${text}]`;
};

// Enhanced pseudo-localization with character transformations
export const enhancedPseudoLocalizeString = (text: string): string => {
  // Character mapping for pseudo-localization
  const charMap: { [key: string]: string } = {
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

  let result = text;

  // Apply character transformations
  for (const [original, replacement] of Object.entries(charMap)) {
    result = result.replace(new RegExp(original, "g"), replacement);
  }

  // Add brackets and some extra characters to simulate longer text
  return `[${result}]`;
};

// Transform an object recursively with pseudo-localization
export const pseudoLocalizeObject = (obj: any): any => {
  if (typeof obj === "string") {
    return enhancedPseudoLocalizeString(obj);
  }
  if (typeof obj === "object" && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = pseudoLocalizeObject(value);
    }
    return result;
  }
  return obj;
};
