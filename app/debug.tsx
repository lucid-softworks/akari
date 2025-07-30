import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { showAlert } from '@/utils/alert';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DebugScreen() {
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());

  const queries = queryClient.getQueryCache().getAll();

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
        <View style={[styles.header, { borderBottomColor: Colors[colorScheme ?? 'light'].icon }]}>
          <ThemedText style={styles.title}>Query Cache Debug</ThemedText>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={[styles.button, styles.invalidateButton]} onPress={invalidateAllQueries}>
              <ThemedText style={styles.buttonText}>Invalidate All</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearAllQueries}>
              <ThemedText style={styles.buttonText}>Clear All</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.statsContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <ThemedText style={styles.statsText}>Total Queries: {queries.length}</ThemedText>
          <ThemedText style={styles.statsText}>
            Active Queries: {queries.filter((q) => q.state.status === 'pending').length}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            Successful Queries: {queries.filter((q) => q.state.status === 'success').length}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            Failed Queries: {queries.filter((q) => q.state.status === 'error').length}
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {queries.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No queries in cache</ThemedText>
            </View>
          ) : (
            queries.map((query, index) => {
              const queryKeyString = formatQueryKey(query.queryKey);
              const isExpanded = expandedQueries.has(queryKeyString);
              const statusColor = getQueryStatusColor(query);
              const statusText = getQueryStatusText(query);

              return (
                <View key={index} style={[styles.queryContainer, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
                  <TouchableOpacity
                    style={[
                      styles.queryHeader,
                      {
                        backgroundColor: Colors[colorScheme ?? 'light'].background,
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
                          backgroundColor: Colors[colorScheme ?? 'light'].background,
                        },
                      ]}
                    >
                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>Query Key:</ThemedText>
                        <Text
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                              color: Colors[colorScheme ?? 'light'].text,
                            },
                          ]}
                        >
                          {queryKeyString}
                        </Text>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>Status:</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                              color: Colors[colorScheme ?? 'light'].text,
                            },
                          ]}
                        >
                          {statusText}
                        </ThemedText>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>Data Updated At:</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                              color: Colors[colorScheme ?? 'light'].text,
                            },
                          ]}
                        >
                          {query.state.dataUpdatedAt ? new Date(query.state.dataUpdatedAt).toLocaleString() : 'Never'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>Error Updated At:</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                              color: Colors[colorScheme ?? 'light'].text,
                            },
                          ]}
                        >
                          {query.state.errorUpdatedAt ? new Date(query.state.errorUpdatedAt).toLocaleString() : 'Never'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailSection}>
                        <ThemedText style={styles.detailLabel}>Fetch Count:</ThemedText>
                        <ThemedText
                          style={[
                            styles.detailValue,
                            {
                              backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                              color: Colors[colorScheme ?? 'light'].text,
                            },
                          ]}
                        >
                          {(query.state as any).fetchCount || 0}
                        </ThemedText>
                      </View>

                      {query.state.error && (
                        <View style={styles.detailSection}>
                          <ThemedText style={styles.detailLabel}>Error:</ThemedText>
                          <Text
                            style={[
                              styles.detailValue,
                              styles.errorText,
                              {
                                backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                              },
                            ]}
                          >
                            {formatQueryData(query.state.error as any)}
                          </Text>
                        </View>
                      )}

                      {(query.state.data as any) && (
                        <View style={styles.detailSection}>
                          <ThemedText style={styles.detailLabel}>Data:</ThemedText>
                          <Text
                            style={[
                              styles.detailValue,
                              {
                                backgroundColor: Colors[colorScheme ?? 'light'].icon + '20',
                                color: Colors[colorScheme ?? 'light'].text,
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
                          <ThemedText style={styles.actionButtonText}>Refetch</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.removeButton]}
                          onPress={() =>
                            queryClient.removeQueries({
                              queryKey: query.queryKey,
                            })
                          }
                        >
                          <ThemedText style={styles.actionButtonText}>Remove</ThemedText>
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
