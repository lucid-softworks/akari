import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ThemeName = keyof typeof Colors;

function CrashReporterTestSection(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [shouldCrash, setShouldCrash] = useState(false);
  const palette = Colors[(colorScheme ?? 'light') as ThemeName];

  if (shouldCrash) {
    throw new Error('Manual crash triggered from the Akari debug screen.');
  }

  const triggerCrash = () => {
    setShouldCrash(true);
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
      <TouchableOpacity style={[styles.button, styles.crashButton]} onPress={triggerCrash}>
        <ThemedText style={styles.buttonText}>{t('debug.triggerCrash')}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={[styles.crashHint, { color: palette.icon }]}>
        {t('debug.crashHint')}
      </ThemedText>
    </View>
  );
}

export default function DebugScreen() {
  const queryClient = useQueryClient();
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
    showAlert({
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
    showAlert({
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

  const formatQueryKey = (queryKey: readonly unknown[]): string => {
    return JSON.stringify(queryKey, null, 2);
  };

  const formatQueryData = (data: any): string => {
    try {
      if (data === null || data === undefined) {
        return 'null';
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return 'Unable to stringify data';
    }
  };

  const getQueryStatusColor = (query: any) => {
    if (query.state.status === 'pending') return '#FFA500';
    if (query.state.status === 'error') return '#FF0000';
    if (query.state.status === 'success') return '#00FF00';
    return '#808080';
  };

  const getQueryStatusText = (query: any) => {
    if (query.state.status === 'pending') return 'Loading';
    if (query.state.status === 'error') return 'Error';
    if (query.state.status === 'success') return 'Success';
    return 'Unknown';
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: Colors[theme].icon }]}>
          <ThemedText style={styles.title}>{t('debug.queryCacheDebug')}</ThemedText>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={[styles.button, styles.invalidateButton]} onPress={invalidateAllQueries}>
              <ThemedText style={styles.buttonText}>{t('debug.invalidateAll')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearAllQueries}>
              <ThemedText style={styles.buttonText}>{t('debug.clearAll')}</ThemedText>
            </TouchableOpacity>
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
            queries.map((query, index) => {
              const queryKeyString = formatQueryKey(query.queryKey);
              const isExpanded = expandedQueries.has(queryKeyString);
              const statusColor = getQueryStatusColor(query);
              const statusText = getQueryStatusText(query);

              return (
                <View key={index} style={[styles.queryContainer, { borderColor: Colors[theme].icon }]}>
                  <TouchableOpacity
                    style={[
                      styles.queryHeader,
                      {
                        backgroundColor: Colors[theme].background,
                      },
                    ]}
                    onPress={() => toggleQueryExpansion(queryKeyString)}
                  >
                    <View style={styles.queryHeaderLeft}>
                      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                      <ThemedText style={styles.queryKey}>
                        {queryKeyString.length > 100 ? queryKeyString.substring(0, 100) + '...' : queryKeyString}
                      </ThemedText>
                    </View>
                    <View style={styles.queryHeaderRight}>
                      <ThemedText style={styles.statusText}>{statusText}</ThemedText>
                      <ThemedText style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</ThemedText>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View
                      style={[
                        styles.queryDetails,
                        {
                          backgroundColor: Colors[theme].background,
                        },
                      ]}
                    >
                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>{t('debug.queryKey')}</ThemedText>
                        <Text
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[theme].icon + '20',
                              color: Colors[theme].text,
                            },
                          ]}
                        >
                          {queryKeyString}
                        </Text>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>{t('debug.status')}</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[theme].icon + '20',
                              color: Colors[theme].text,
                            },
                          ]}
                        >
                          {statusText}
                        </ThemedText>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>{t('debug.dataUpdatedAt')}</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[theme].icon + '20',
                              color: Colors[theme].text,
                            },
                          ]}
                        >
                          {query.state.dataUpdatedAt ? new Date(query.state.dataUpdatedAt).toLocaleString() : 'Never'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>{t('debug.errorUpdatedAt')}</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[theme].icon + '20',
                              color: Colors[theme].text,
                            },
                          ]}
                        >
                          {query.state.errorUpdatedAt
                            ? new Date(query.state.errorUpdatedAt).toLocaleString()
                            : 'Never'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>{t('debug.fetchCount')}</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[theme].icon + '20',
                              color: Colors[theme].text,
                            },
                          ]}
                        >
                          {(query.state as any).fetchCount || 0}
                        </ThemedText>
                      </View>

                      {query.state.error && (
                        <View style={styles.detailSection}>
                          <ThemedText style={styles.detailLabel}>{t('debug.error')}</ThemedText>
                          <Text
                            style={[
                              styles.detailValue,
                              styles.errorText,
                              {
                                backgroundColor: Colors[theme].icon + '20',
                              },
                            ]}
                          >
                            {formatQueryData(query.state.error as any)}
                          </Text>
                        </View>
                      )}

                      {(query.state.data as any) && (
                        <View style={styles.detailSection}>
                          <ThemedText style={styles.detailLabel}>{t('debug.data')}</ThemedText>
                          <Text
                            style={[
                              styles.detailValue,
                              {
                                backgroundColor: Colors[theme].icon + '20',
                                color: Colors[theme].text,
                              },
                            ]}
                          >
                            {formatQueryData(query.state.data as any)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.queryActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.refetchButton]}
                          onPress={() =>
                            queryClient.invalidateQueries({
                              queryKey: query.queryKey,
                            })
                          }
                        >
                          <ThemedText style={styles.actionButtonText}>{t('debug.refetch')}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.removeButton]}
                          onPress={() =>
                            queryClient.removeQueries({
                              queryKey: query.queryKey,
                            })
                          }
                        >
                          <ThemedText style={styles.actionButtonText}>{t('debug.remove')}</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
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
  queryContainer: {
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  queryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  queryKey: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  queryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 12,
  },
  queryDetails: {
    padding: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 4,
  },
  errorText: {
    color: '#FF0000',
  },
  queryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  refetchButton: {
    backgroundColor: '#007AFF',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
