type Selection = { start: number; end: number };

/**
 * Inserts `inserted` at the current selection range within `source`,
 * clamping the selection bounds. Returns the new text and the cursor
 * position the caller should move the selection ref to.
 */
export function insertAtSelection(
  source: string,
  selection: Selection,
  inserted: string,
): { nextText: string; cursor: number } {
  const safeStart = Math.min(Math.max(selection.start, 0), source.length);
  const safeEnd = Math.min(Math.max(selection.end, safeStart), source.length);
  const nextText = source.slice(0, safeStart) + inserted + source.slice(safeEnd);
  return { nextText, cursor: safeStart + inserted.length };
}
