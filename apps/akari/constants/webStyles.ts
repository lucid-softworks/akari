import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

/**
 * Web-only left/right column borders, factored out so every component
 * that paints the column edge (FeedListHeader, PostCard, etc.) uses
 * the literally-identical style object. Anything that diverges from
 * this — even subtly different property order or naming
 * (borderColor shorthand vs border*Color per-side) — risks
 * RN-Web compiling to different atomic CSS classes that may render
 * with different anti-aliasing / sub-pixel offsets.
 *
 * Callers pass the resolved border colour (from useBorderColor) so we
 * don't take a hook dependency here.
 */
export function webColumnSideBorders(borderColor: string) {
  if (Platform.OS !== 'web') return null;
  return {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: borderColor,
    borderRightColor: borderColor,
  } as const;
}

/**
 * Web-only root style for tab screens. Replaces the native `flex: 1`
 * pattern.
 *
 * The trap that caused the column border to cut off after viewport
 * height: `flex: 1` resolves to `flex-grow: 1; flex-shrink: 1;
 * flex-basis: 0`. With flex-basis: 0, the screen contributes ZERO to
 * its parent's intrinsic height during flex layout, so the column
 * (which sizes itself to its in-flow children) never saw the
 * virtualised feed's real height — it just stayed at `min-height:
 * 100vh` while the screen overflowed visually past it.
 *
 * Dropping `flex: 1` and using the default `flex: 0 1 auto` gives the
 * screen `flex-basis: auto`, which IS its content's intrinsic height.
 * The column then sizes correctly to its content. `minHeight: 100vh`
 * keeps short pages filling the viewport so the borders still run
 * down the whole screen on a single-post page. `overflow: visible`
 * lets sticky/fixed children inside the screen escape this box and
 * pin to the document viewport.
 */
export const webScreenContainer = {
  minHeight: '100vh',
  overflow: 'visible',
} as unknown as ViewStyle;
