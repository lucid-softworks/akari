import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
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
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export type MenuOption<T extends string> = {
  value: T;
  label: string;
};

type MenuProps<T extends string> = {
  value: T;
  options: readonly MenuOption<T>[];
  onChange: (next: T) => void;
  /**
   * Builds the closed-state trigger. `ref` must be attached to a `View`-
   * compatible element we can `measureInWindow` against to anchor the
   * portaled dropdown on web. `onPress` toggles the menu open.
   */
  renderTrigger: (args: {
    onPress: () => void;
    ref: React.RefObject<View | null>;
    isOpen: boolean;
  }) => React.ReactNode;
  /** Rough menu height (px) used by the portal for above/below flip logic. */
  estimatedHeight?: number;
};

/**
 * Tap-to-open menu primitive. On web it portals the menu out to escape
 * ancestor `overflow: hidden` and stacking contexts; on native it falls
 * back to a bottom-sheet Modal. Items show a hover highlight on web (via
 * Pressable's `onHoverIn`/`onHoverOut`) and a press-state highlight on
 * native.
 */
export function Menu<T extends string>({
  value,
  options,
  onChange,
  renderTrigger,
  estimatedHeight = 240,
}: MenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<WebPortalAnchorRect | null>(null);
  const triggerRef = useRef<View | null>(null);
  const menuContentRef = useRef<View | null>(null);
  const { bottom } = useSafeAreaInsets();

  // Outside-click dismissal on web: while the menu is open, listen on
  // `window` in the capture phase so this handler fires before any
  // descendant onPress. If the click target lives inside either the
  // trigger or the portaled menu, leave it to the inner handler; if it
  // falls outside both, close. Capture phase is required so a re-click
  // on the trigger doesn't first close (via outside-click) and then
  // reopen (via the trigger's `onPress -> toggle`).
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
    // Re-tapping the trigger while open closes the menu. Without this the
    // user has to click outside the menu to dismiss, which is awkward when
    // the trigger is exactly where their finger / cursor already is.
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

  const handleSelect = useCallback(
    (next: T) => {
      onChange(next);
      setIsOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    return () => setIsOpen(false);
  }, []);

  const trigger = renderTrigger({ onPress: toggle, ref: triggerRef, isOpen });

  // Wrapping the menu in a ref-bearing View gives the outside-click
  // handler a DOM node to `contains`-check against on web.
  const menu = (
    <View ref={menuContentRef} collapsable={false}>
      <MenuBody value={value} options={options} onSelect={handleSelect} />
    </View>
  );

  return (
    <>
      {trigger}
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
    </>
  );
}

type MenuBodyProps<T extends string> = {
  value: T;
  options: readonly MenuOption<T>[];
  onSelect: (next: T) => void;
};

function MenuBody<T extends string>({ value, options, onSelect }: MenuBodyProps<T>) {
  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const hoverBg = useThemeColor({ light: '#F3F4F6', dark: '#2A2D33' }, 'background');

  return (
    <ThemedView style={[styles.menu, { backgroundColor: sheetBg, borderColor }]}>
      {options.map((option, index) => (
        <React.Fragment key={option.value}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
          <MenuItem
            option={option}
            isActive={option.value === value}
            textColor={textColor}
            hoverBg={hoverBg}
            onPress={() => onSelect(option.value)}
          />
        </React.Fragment>
      ))}
    </ThemedView>
  );
}

type MenuItemProps<T extends string> = {
  option: MenuOption<T>;
  isActive: boolean;
  textColor: string;
  hoverBg: string;
  onPress: () => void;
};

function MenuItem<T extends string>({ option, isActive, textColor, hoverBg, onPress }: MenuItemProps<T>) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={({ pressed }) => [
        styles.item,
        (pressed || isHovered) && { backgroundColor: hoverBg },
        pressed && { opacity: activeOpacity.default },
      ]}
    >
      <ThemedText style={[styles.itemLabel, { color: textColor }]}>{option.label}</ThemedText>
      {isActive ? (
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
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemLabel: {
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
