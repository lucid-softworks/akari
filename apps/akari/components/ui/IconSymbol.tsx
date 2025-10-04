// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, View } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;
type IconSymbolProps = {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
};

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
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
  'checkmark.seal.fill': 'verified',
  'info.circle.fill': 'info',
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
  'speaker.slash.fill': 'volume-off',
  'hand.raised.fill': 'back-hand',
  'eye.fill': 'visibility',
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
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />
    </View>
  );
}
