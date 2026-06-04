import { useColorScheme } from '@/hooks/useColorScheme';
// The library's default export is named `EmojiPicker` (a modal wrapper with
// open/onClose); rename on import to avoid shadowing our own component.
import EmojiPickerLib from 'rn-emoji-keyboard';

import { Colors } from '@/constants/Colors';

type EmojiPickerProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the selected emoji's character (e.g. "👍"). */
  onSelectEmoji: (emoji: string) => void;
};

/**
 * Themed wrapper around `rn-emoji-keyboard`'s EmojiPicker. Uses the app's
 * dark/light palette so the sheet matches the rest of the chrome instead
 * of falling back to its bright default.
 *
 * Recently-picked emojis are persisted automatically by the underlying
 * library (no MMKV wiring needed for v1).
 */
export function EmojiPicker({ visible, onClose, onSelectEmoji }: EmojiPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <EmojiPickerLib
      open={visible}
      onClose={onClose}
      onEmojiSelected={(emoji) => onSelectEmoji(emoji.emoji)}
      enableSearchBar
      enableRecentlyUsed
      // Pin the category nav to the top so iOS home-indicator inset doesn't
      // clip it. `floating` looked nice but kept getting half-cut at the
      // bottom of the sheet.
      categoryPosition="top"
      defaultHeight="60%"
      expandedHeight="85%"
      theme={{
        backdrop: 'rgba(0,0,0,0.4)',
        knob: palette.border,
        container: palette.background,
        header: palette.text,
        skinTonesContainer: palette.background,
        category: {
          icon: palette.icon,
          iconActive: palette.tint,
          container: 'transparent',
          containerActive: palette.hover,
        },
        search: {
          background: palette.hover,
          text: palette.text,
          placeholder: palette.icon,
          icon: palette.icon,
        },
        emoji: {
          selected: palette.hover,
        },
      }}
    />
  );
}

