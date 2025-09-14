// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, View } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

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
  'chevron.down': 'expand-more',
  'bell.fill': 'notifications',
  sparkles: 'auto-awesome',
  magnifyingglass: 'search',
  'message.fill': 'message',
  'person.fill': 'person',
  'gearshape.fill': 'settings',
  'arrowshape.turn.up.left': 'reply',
  'bubble.left': 'chat-bubble-outline',
  'arrow.2.squarepath': 'repeat',
  heart: 'favorite-border',
  'heart.fill': 'favorite',
  'pin.fill': 'push-pin',
  pin: 'push-pin',
  ellipsis: 'more-horiz',
  camera: 'camera-alt',
  photo: 'photo',
  at: 'alternate-email',
  'quote.bubble': 'format-quote',
  bell: 'notifications',
  plus: 'add',
  'xmark.circle.fill': 'cancel',
  gif: 'gif',
  clock: 'schedule',
  'arrow.up.circle.fill': 'keyboard-arrow-up',
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
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />
    </View>
  );
}
