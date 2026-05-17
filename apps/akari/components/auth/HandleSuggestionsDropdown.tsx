import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, radius, shadows, spacing } from '@/constants/tokens';

type TypeaheadActor = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HandleSuggestionsDropdownProps = {
  results: TypeaheadActor[];
  anchorRect: AnchorRect;
  borderColor: string;
  helperColor: string;
  suggestionBackground: string;
  onSelect: (handle: string) => void;
};

export function HandleSuggestionsDropdown({
  results,
  anchorRect,
  borderColor,
  helperColor,
  suggestionBackground,
  onSelect,
}: HandleSuggestionsDropdownProps) {
  return (
    <View
      pointerEvents="auto"
      style={[
        // `position: fixed` on web pins the dropdown to the viewport,
        // matching `measureInWindow`'s reference frame exactly. On
        // native, fall back to absolute (the screen root is the
        // positioned ancestor and uses the same coord space).
        Platform.OS === 'web' ? webDropdownBase : nativeDropdownBase,
        {
          top: anchorRect.y + anchorRect.height + spacing.xs,
          left: anchorRect.x,
          width: anchorRect.width,
          backgroundColor: suggestionBackground,
          borderColor,
        },
      ]}
    >
      <ScrollView
        style={styles.suggestionsScroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* oxlint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- Bounded typeahead-results dropdown (server returns a small slice, ~5-10 items), virtualization overhead > scan cost */}
        {results.map((actor, index) => {
          const isLast = index === results.length - 1;
          return (
            <Pressable
              key={actor.did}
              onPress={() => onSelect(actor.handle)}
              style={({ pressed }) => [
                styles.suggestion,
                !isLast && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline },
                pressed && { opacity: 0.7 },
              ]}
            >
              {actor.avatar ? (
                <Image source={{ uri: actor.avatar }} style={styles.suggestionAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.suggestionAvatar, styles.suggestionAvatarPlaceholder, { borderColor }]} />
              )}
              <View style={styles.suggestionText}>
                {actor.displayName ? (
                  <ThemedText style={styles.suggestionName} numberOfLines={1}>
                    {actor.displayName}
                  </ThemedText>
                ) : null}
                <ThemedText
                  style={[styles.suggestionHandle, { color: helperColor }]}
                  numberOfLines={1}
                >
                  @{actor.handle}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const dropdownBaseStatic = {
  maxHeight: 220,
  borderWidth: layout.hairline,
  borderRadius: radius.sm,
  overflow: 'hidden' as const,
  ...shadows.md,
};

const webDropdownBase = {
  ...dropdownBaseStatic,
  position: 'fixed' as 'absolute',
};

const nativeDropdownBase = {
  ...dropdownBaseStatic,
  position: 'absolute' as const,
};

const styles = StyleSheet.create({
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  suggestionAvatarPlaceholder: {
    borderWidth: layout.hairline,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  suggestionHandle: {
    fontSize: fontSize.sm,
  },
});
