import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';

type ThemeName = keyof typeof Colors;

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

type QueryCacheItemProps = {
  query: any;
  theme: ThemeName;
  isExpanded: boolean;
  onToggle: (queryKeyString: string) => void;
};

export function QueryCacheItem({ query, theme, isExpanded, onToggle }: QueryCacheItemProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const queryKeyString = formatQueryKey(query.queryKey);
  const statusColor = getQueryStatusColor(query);
  const statusText = getQueryStatusText(query);

  return (
    <View style={[styles.queryContainer, { borderColor: Colors[theme].icon }]}>
      <Pressable
        style={({ pressed }) => [styles.queryHeader,
          {
            backgroundColor: Colors[theme].background,
          }, pressed && { opacity: 0.7 }]}
        onPress={() => onToggle(queryKeyString)}
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
      </Pressable>

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
              {/* oxlint-disable-next-line react-doctor/rendering-hydration-mismatch-time -- Expo Router runs client-side, no SSR hydration in this build. */}
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
              {/* oxlint-disable-next-line react-doctor/rendering-hydration-mismatch-time -- Expo Router runs client-side, no SSR hydration in this build. */}
              {query.state.errorUpdatedAt ? new Date(query.state.errorUpdatedAt).toLocaleString() : 'Never'}
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
            <Pressable
              style={({ pressed }) => [styles.actionButton, styles.refetchButton, pressed && { opacity: 0.7 }]}
              onPress={() =>
                queryClient.invalidateQueries({
                  queryKey: query.queryKey,
                })
              }
            >
              <ThemedText style={styles.actionButtonText}>{t('debug.refetch')}</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionButton, styles.removeButton, pressed && { opacity: 0.7 }]}
              onPress={() =>
                queryClient.removeQueries({
                  queryKey: query.queryKey,
                })
              }
            >
              <ThemedText style={styles.actionButtonText}>{t('debug.remove')}</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
