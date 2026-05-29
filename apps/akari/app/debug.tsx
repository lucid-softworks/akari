import { QueryCacheItem } from '@/components/debug/QueryCacheItem';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ThemeName = keyof typeof Colors;

function CrashReporterTestSection(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  // Use functional setState that throws to surface the crash through React's
  // render boundary (so the crash reporter wraps it) without keeping a
  // throwaway boolean in state.
  const [, setCrashTrigger] = useState(0);
  const palette = Colors[(colorScheme ?? 'light') as ThemeName];

  const triggerCrash = () => {
    setCrashTrigger(() => {
      throw new Error('Manual crash triggered from the Akari debug screen.');
    });
  };

  return (
    <View
      style={[
        styles.crashSection,
        {
          backgroundColor: palette.background,
          borderColor: palette.icon,
        },
      ]}
    >
      <ThemedText style={styles.crashTitle}>{t('debug.crashReporter')}</ThemedText>
      <ThemedText style={styles.crashDescription}>
        {t('debug.crashDescription')}
      </ThemedText>
      <Pressable style={({ pressed }) => [styles.button, styles.crashButton, pressed && { opacity: 0.7 }]} onPress={triggerCrash}>
        <ThemedText style={styles.buttonText}>{t('debug.triggerCrash')}</ThemedText>
      </Pressable>
      <ThemedText style={[styles.crashHint, { color: palette.icon }]}>
        {t('debug.crashHint')}
      </ThemedText>
    </View>
  );
}

const formatQueryKey = (queryKey: readonly unknown[]): string => {
  return JSON.stringify(queryKey, null, 2);
};

export default function DebugScreen() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());

  const queries = queryClient.getQueryCache().getAll();

  const theme: ThemeName = useMemo(() => (colorScheme ?? 'light') as ThemeName, [colorScheme]);

  const toggleQueryExpansion = (queryKey: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryKey)) {
      newExpanded.delete(queryKey);
    } else {
      newExpanded.add(queryKey);
    }
    setExpandedQueries(newExpanded);
  };

  const clearAllQueries = () => {
    confirm({
      title: 'Clear All Queries',
      message: 'Are you sure you want to clear all cached queries?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            queryClient.clear();
            setExpandedQueries(new Set());
          },
        },
      ],
    });
  };

  const invalidateAllQueries = () => {
    confirm({
      title: 'Invalidate All Queries',
      message: 'Are you sure you want to invalidate all queries? This will refetch all data.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invalidate',
          style: 'destructive',
          onPress: () => {
            queryClient.invalidateQueries();
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: Colors[theme].icon }]}>
          <ThemedText style={styles.title}>{t('debug.queryCacheDebug')}</ThemedText>
          <View style={styles.headerButtons}>
            <Pressable style={({ pressed }) => [styles.button, styles.invalidateButton, pressed && { opacity: 0.7 }]} onPress={invalidateAllQueries}>
              <ThemedText style={styles.buttonText}>{t('debug.invalidateAll')}</ThemedText>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.button, styles.clearButton, pressed && { opacity: 0.7 }]} onPress={clearAllQueries}>
              <ThemedText style={styles.buttonText}>{t('debug.clearAll')}</ThemedText>
            </Pressable>
          </View>
        </View>

        <CrashReporterTestSection />

        <View style={[styles.statsContainer, { backgroundColor: Colors[theme].background }]}>
          <ThemedText style={styles.statsText}>{t('debug.totalQueries', { count: queries.length })}</ThemedText>
          <ThemedText style={styles.statsText}>
            {t('debug.activeQueries', { count: queries.filter((q) => q.state.status === 'pending').length })}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            {t('debug.successfulQueries', { count: queries.filter((q) => q.state.status === 'success').length })}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            {t('debug.failedQueries', { count: queries.filter((q) => q.state.status === 'error').length })}
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {queries.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>{t('debug.noQueriesInCache')}</ThemedText>
            </View>
          ) : (
            queries.map((query) => {
              const queryKeyString = formatQueryKey(query.queryKey);
              return (
                <QueryCacheItem
                  key={queryKeyString}
                  query={query}
                  theme={theme}
                  isExpanded={expandedQueries.has(queryKeyString)}
                  onToggle={toggleQueryExpansion}
                />
              );
            })
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  crashSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  crashTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  crashDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  crashButton: {
    backgroundColor: '#EF4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  crashHint: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  invalidateButton: {
    backgroundColor: '#FFA500',
  },
  clearButton: {
    backgroundColor: '#FF0000',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 16,
  },
  statsText: {
    fontSize: 14,
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
  },
});
