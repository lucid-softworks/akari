import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WebPortalDropdown, type WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  opacity,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export type MenuItem = {
  key: string;
  label: string;
  /** Optional `IconSymbol` name rendered to the left of the label. */
  icon?: string;
  /** When true, the row paints in the danger colour (matches block/report). */
  destructive?: boolean;
  /** Disables the row (greyed out, no press feedback). */
  disabled?: boolean;
  /** Renders a trailing checkmark; use for picker-style menus. */
  selected?: boolean;
  onPress: () => void;
};

type MenuContextValue = {
  triggerRef: React.RefObject<View | null>;
  toggle: () => void;
  isOpen: boolean;
};

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(componentName: string): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error(`<${componentName}> must be rendered inside a <Menu>.`);
  }
  return ctx;
}

type MenuProps = {
  items: readonly MenuItem[];
  /** The trigger (wrap in `<MenuTrigger>`) and anything else to render alongside it. */
  children: React.ReactNode;
  /** Rough menu height (px) used by the web portal for above/below flip logic. */
  estimatedHeight?: number;
};

/**
 * Tap-to-open menu primitive. On web it portals the menu out to escape
 * ancestor `overflow: hidden` and stacking contexts; on native it falls
 * back to a bottom-sheet Modal. Items show a hover highlight on web (via
 * Pressable's `onHoverIn`/`onHoverOut`) and a press-state highlight on
 * native. Re-tapping the trigger closes the menu; clicking anywhere
 * outside the trigger or the menu on web also closes it.
 *
 * Pair with `<MenuTrigger>` for the tap target:
 *
 * ```tsx
 * <Menu items={items}>
 *   <MenuTrigger style={styles.button}>
 *     <IconSymbol name="ellipsis" />
 *   </MenuTrigger>
 * </Menu>
 * ```
 *
 * Items carry their own `onPress` so the same primitive serves both
 * picker (mark `selected: true` on the active row) and action (set
 * `icon` / `destructive`) menus.
 */
export function Menu({ items, children, estimatedHeight = 240 }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<WebPortalAnchorRect | null>(null);
  const triggerRef = useRef<View | null>(null);
  const menuContentRef = useRef<View | null>(null);
  const { bottom } = useSafeAreaInsets();

  // Outside-click dismissal on web: capture-phase mousedown so this
  // handler fires before any descendant onPress. If the click target
  // lives inside either the trigger or the portaled menu, leave it to
  // the inner handler; if it falls outside both, close. Capture phase
  // is required so a re-click on the trigger doesn't first close (via
  // outside-click) and then reopen (via the trigger's toggle).
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const triggerEl = triggerRef.current as unknown as HTMLElement | null;
      const menuEl = menuContentRef.current as unknown as HTMLElement | null;
      if (triggerEl?.contains(target) || menuEl?.contains(target)) return;
      setIsOpen(false);
    };
    window.addEventListener('mousedown', handler, true);
    return () => window.removeEventListener('mousedown', handler, true);
  }, [isOpen]);

  const toggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    if (Platform.OS !== 'web' || !triggerRef.current) {
      setAnchorRect(null);
      setIsOpen(true);
      return;
    }
    triggerRef.current.measureInWindow((x, y, width, height) => {
      setAnchorRect({ top: y, bottom: y + height, left: x, width, height });
      setIsOpen(true);
    });
  }, [isOpen]);

  const handleSelect = useCallback((item: MenuItem) => {
    if (item.disabled) return;
    item.onPress();
    setIsOpen(false);
  }, []);

  useEffect(() => () => setIsOpen(false), []);

  const contextValue = useMemo<MenuContextValue>(
    () => ({ triggerRef, toggle, isOpen }),
    [toggle, isOpen],
  );

  const menu = (
    <View ref={menuContentRef} collapsable={false}>
      <MenuBody items={items} onSelect={handleSelect} />
    </View>
  );

  return (
    <MenuContext.Provider value={contextValue}>
      {children}
      {Platform.OS === 'web' ? (
        <WebPortalDropdown
          visible={isOpen}
          anchorRect={anchorRect}
          estimatedHeight={estimatedHeight}
          onDismiss={() => setIsOpen(false)}
        >
          {menu}
        </WebPortalDropdown>
      ) : (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
            <Pressable
              style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
              onPress={(event) => event.stopPropagation()}
            >
              {menu}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </MenuContext.Provider>
  );
}

type MenuTriggerProps = Omit<PressableProps, 'onPress'> & {
  children: React.ReactNode;
};

/**
 * Tappable trigger paired with `<Menu>`. Hands its ref to the parent
 * Menu so the portaled web dropdown can anchor against it, and wires
 * the tap to the Menu's toggle. Accepts the same props as `Pressable`
 * (style, accessibilityLabel, hitSlop, …) except `onPress`, which Menu
 * owns.
 */
export function MenuTrigger({ children, ...pressableProps }: MenuTriggerProps) {
  const { triggerRef, toggle, isOpen } = useMenuContext('MenuTrigger');
  return (
    <Pressable
      {...pressableProps}
      ref={triggerRef}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
    >
      {children}
    </Pressable>
  );
}

type MenuBodyProps = {
  items: readonly MenuItem[];
  onSelect: (item: MenuItem) => void;
};

function MenuBody({ items, onSelect }: MenuBodyProps) {
  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const hoverBg = useThemeColor({ light: '#F3F4F6', dark: '#2A2D33' }, 'background');

  return (
    <ThemedView style={[styles.menu, { backgroundColor: sheetBg, borderColor }]}>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
          <MenuItemRow
            item={item}
            textColor={textColor}
            iconColor={iconColor}
            hoverBg={hoverBg}
            onPress={() => onSelect(item)}
          />
        </React.Fragment>
      ))}
    </ThemedView>
  );
}

type MenuItemRowProps = {
  item: MenuItem;
  textColor: string;
  iconColor: string;
  hoverBg: string;
  onPress: () => void;
};

function MenuItemRow({ item, textColor, iconColor, hoverBg, onPress }: MenuItemRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const labelColor = item.destructive ? semanticColors.danger : textColor;
  const itemIconColor = item.destructive ? semanticColors.danger : iconColor;

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: item.disabled, selected: item.selected }}
      disabled={item.disabled}
      onPress={onPress}
      onHoverIn={() => !item.disabled && setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={({ pressed }) => [
        styles.item,
        item.disabled && { opacity: opacity.disabled },
        !item.disabled && (pressed || isHovered) && { backgroundColor: hoverBg },
        !item.disabled && pressed && { opacity: activeOpacity.default },
      ]}
    >
      {item.icon ? (
        <IconSymbol
          name={item.icon as Parameters<typeof IconSymbol>[0]['name']}
          size={20}
          color={itemIconColor}
        />
      ) : null}
      <ThemedText style={[styles.itemLabel, { color: labelColor }]}>{item.label}</ThemedText>
      {item.selected ? (
        <IconSymbol name="checkmark" size={16} color={semanticColors.systemBlue} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: {
    minWidth: 220,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: layout.hairline,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
});
