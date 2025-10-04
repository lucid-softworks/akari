export function normaliseDid(value: string | undefined): string | null {
  if (!value) return null;
  const did = value.trim();
  return did.length > 0 ? did.toLowerCase() : null;
}

export function didFromUri(uri: string | undefined): string | null {
  if (!uri) return null;
  if (!uri.startsWith('at://')) return null;
  const [did] = uri.substring('at://'.length).split('/', 1);
  return normaliseDid(did);
}
