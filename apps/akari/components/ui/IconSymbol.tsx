// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { BadgeCheck, type LucideProps } from 'lucide-react-native';
import { ComponentProps, ComponentType } from 'react';
import { OpaqueColorValue, type StyleProp, type ViewStyle, View } from 'react-native';

// Keys are string (not just SymbolViewProps['name']) so callers can pass
// MaterialIcon-only names like "gif" that don't have a corresponding
// SF Symbol on iOS — the .ios.tsx variant accepts arbitrary strings too.
type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

// Per-icon lucide overrides for SF Symbols that MaterialIcons can't render
// faithfully. Looked up before the MaterialIcons fallback. Keep this list
// short — lucide has a different visual weight from MaterialIcons, so only
// override when MaterialIcons genuinely lacks an equivalent.
//
// `strokeWidth` defaults to 1.75 on lucide icons used here — lucide's stock 2
// reads visibly thicker than SF Symbols' weight at small sizes; 1.75 brings
// the two platforms into reasonable parity.
const LUCIDE_OVERRIDES: Record<string, ComponentType<LucideProps>> = {
  // The outline-only `seal-with-check` shape. MaterialIcons has only the
  // filled `verified` variant, so use lucide's BadgeCheck for the outline.
  // The filled variant (`checkmark.seal.fill`) keeps using MaterialIcons
  // `verified` — it already renders as a properly filled badge with a
  // contrasting check inside.
  'checkmark.seal': BadgeCheck,
};
type IconSymbolProps = {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
};

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  house: 'home',
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.down': 'expand-more',
  'bell.fill': 'notifications',
  'bell.badge': 'notifications-none',
  'bell.badge.fill': 'notifications-active',
  sparkles: 'auto-awesome',
  magnifyingglass: 'search',
  'message.fill': 'message',
  'person.fill': 'person',
  'person.crop.circle': 'account-circle',
  'person.crop.circle.badge.checkmark': 'how-to-reg',
  'gearshape.fill': 'settings',
  'bookmark.fill': 'bookmark',
  'arrowshape.turn.up.left': 'reply',
  'bubble.left': 'chat-bubble-outline',
  'text.bubble': 'chat-bubble',
  'text.bubble.fill': 'forum',
  'text.badge.minus': 'text-fields',
  'arrow.2.squarepath': 'repeat',
  heart: 'favorite-border',
  'heart.fill': 'favorite',
  'pin.fill': 'push-pin',
  pin: 'push-pin',
  ellipsis: 'more-horiz',
  xmark: 'close',
  camera: 'camera-alt',
  photo: 'photo',
  'photo.on.rectangle': 'photo-library',
  at: 'alternate-email',
  'quote.bubble': 'format-quote',
  bell: 'notifications',
  plus: 'add',
  'xmark.circle.fill': 'cancel',
  gif: 'gif',
  clock: 'schedule',
  'clock.fill': 'schedule',
  'arrow.up.circle.fill': 'keyboard-arrow-up',
  'checkmark.circle.fill': 'check-circle',
  // MaterialIcons has only one verified-with-check icon — both states map
  // to it. Call sites that need the filled-vs-outline distinction
  // (e.g. VerifiersSheet's per-row trust toggle) should bypass IconSymbol
  // and use `lucide-react-native`'s `<BadgeCheck>` directly.
  'checkmark.seal': 'verified',
  'checkmark.seal.fill': 'verified',
  'info.circle': 'info-outline',
  'info.circle.fill': 'info',
  'square.grid.2x2': 'grid-view',
  'figure.wave.circle': 'accessibility-new',
  'lock.fill': 'lock',
  'lock.shield.fill': 'security',
  'shield.fill': 'shield',
  'doc.text.fill': 'description',
  'questionmark.circle': 'help-outline',
  'exclamationmark.triangle.fill': 'warning',
  'paintpalette.fill': 'palette',
  'paintbrush.fill': 'brush',
  'figure.stand': 'accessibility',
  globe: 'public',
  'hammer.fill': 'gavel',
  'waveform.path': 'timeline',
  'key.fill': 'vpn-key',
  'eye.slash.fill': 'visibility-off',
  'speaker.slash': 'volume-off',
  'speaker.slash.fill': 'volume-off',
  'hand.raised.fill': 'back-hand',
  'eye.fill': 'visibility',
  star: 'star-border',
  'star.fill': 'star',
  'rectangle.stack.fill': 'collections',
  'play.circle.fill': 'play-circle-filled',
  'envelope.fill': 'email',
  pencil: 'edit',
  calendar: 'calendar-today',
  'square.and.arrow.up': 'ios-share',
  'square.and.pencil': 'border-color',
  'circle.lefthalf.filled': 'brightness-6',
  'moon.zzz.fill': 'bedtime',
  'trash.fill': 'delete',
  'textformat.size': 'format-size',
  'textformat.size.larger': 'text-increase',
  'number.circle': 'numbers',
  'number.circle.fill': 'numbers',
  'person.2.fill': 'group',
  bookmark: 'bookmark-border',
  'bubble.left.and.bubble.right': 'forum',
  checkmark: 'check',
  'chevron.up': 'expand-less',
  circle: 'radio-button-unchecked',
  'doc.text': 'description',
  'arrow.up.right.square': 'open-in-new',
  'exclamationmark.triangle': 'warning-amber',
  'face.smiling': 'mood',
  flame: 'local-fire-department',
  'fork.knife': 'restaurant',
  gearshape: 'settings',
  'line.3.horizontal.decrease.circle': 'tune',
  link: 'link',
  'list.bullet': 'format-list-bulleted',
  'minus.circle': 'remove-circle-outline',
  'minus.circle.fill': 'remove-circle',
  'photo.on.rectangle.angled': 'photo-library',
  'play.fill': 'play-arrow',
  'plus.circle': 'add-circle-outline',
  'plus.circle.fill': 'add-circle',
  speedometer: 'speed',
  tag: 'sell',
  trash: 'delete-outline',
  video: 'videocam',
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: IconSymbolProps) {
  const Lucide = LUCIDE_OVERRIDES[name];
  // `style` is forwarded to the *outer* View (where layout props like
  // `marginRight` belong). Applying it to the inner MaterialIcons / lucide
  // glyph instead would either get clipped by the fixed-size wrapper
  // (MaterialIcons) or silently dropped (lucide doesn't accept style props),
  // causing icons to render mis-positioned and squished.
  return (
    <View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {Lucide ? (
        <Lucide size={size} color={color as string} strokeWidth={1.75} />
      ) : (
        <MaterialIcons color={color} size={size} name={MAPPING[name]} />
      )}
    </View>
  );
}
