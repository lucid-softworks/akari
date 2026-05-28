import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SearchTabs } from '@/components/SearchTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';

export type SearchTabType = 'all' | 'users' | 'posts';
export type SearchSort = 'top' | 'latest';

export type SearchHeaderVisibility = {
  tabs: boolean;
  sort: boolean;
  title: boolean;
};

type SearchListHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onSearch: () => void;
  isLoading: boolean;
  activeTab: SearchTabType;
  onTabChange: (tab: SearchTabType) => void;
  /** Forwarded to `SearchTabs` so the "All" tab can be hidden in guest mode. */
  isGuest?: boolean;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  show: SearchHeaderVisibility;
  topInset: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  placeholderColor: string;
  title: string;
  inputPlaceholder: string;
  searchLabel: string;
  searchingLabel: string;
  topLabel: string;
  latestLabel: string;
  clearLabel: string;
};

const SearchListHeaderInner = ({
  query,
  onQueryChange,
  onClearQuery,
  onSearch,
  isLoading,
  activeTab,
  onTabChange,
  isGuest,
  sort,
  onSortChange,
  show,
  topInset,
  backgroundColor,
  borderColor,
  textColor,
  placeholderColor,
  title,
  inputPlaceholder,
  searchLabel,
  searchingLabel,
  topLabel,
  latestLabel,
  clearLabel,
}: SearchListHeaderProps) => {
  return (
    <ThemedView
      style={[
        styles.listHeaderContainer,
        {
          paddingTop: topInset,
          paddingBottom: show.title ? spacing.md : 0,
        },
      ]}
    >
      {show.title ? (
        <ThemedView style={styles.header}>
          <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>
        </ThemedView>
      ) : null}

      <ThemedView style={styles.searchContainer}>
        <Input
          containerStyle={styles.inputContainer}
          placeholder={inputPlaceholder}
          placeholderTextColor={placeholderColor}
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          suffix={
            query.length > 0 ? (
              <Pressable
                onPress={onClearQuery}
                accessibilityRole="button"
                accessibilityLabel={clearLabel}
                hitSlop={8}
                style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="xmark.circle.fill" size={18} color={placeholderColor} />
              </Pressable>
            ) : null
          }
        />
        <Pressable
          style={({ pressed }) => [
            styles.searchButton,
            { backgroundColor: borderColor },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onSearch}
          disabled={isLoading}
        >
          <ThemedText style={[styles.searchButtonText, { color: textColor }]}>
            {isLoading ? searchingLabel : searchLabel}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {show.tabs ? <SearchTabs activeTab={activeTab} onTabChange={onTabChange} isGuest={isGuest} /> : null}

      {show.sort ? (
        <ThemedView style={styles.sortContainer}>
          {(['top', 'latest'] as const).map((option) => {
            const isActive = sort === option;
            return (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.sortChip,
                  {
                    backgroundColor: isActive ? textColor : 'transparent',
                    borderColor,
                  },
                  pressed && { opacity: activeOpacity.default },
                ]}
                onPress={() => onSortChange(option)}
              >
                <ThemedText
                  style={[
                    styles.sortChipText,
                    { color: isActive ? backgroundColor : textColor },
                  ]}
                >
                  {option === 'top' ? topLabel : latestLabel}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
};

export const SearchListHeader = React.memo(SearchListHeaderInner);
SearchListHeader.displayName = 'SearchListHeader';

const styles = StyleSheet.create({
  listHeaderContainer: {},
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    height: 44,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  sortChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
