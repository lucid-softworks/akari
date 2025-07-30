import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  PostCardSkeleton,
  ProfileHeaderSkeleton,
  SearchResultSkeleton,
  NotificationSkeleton,
  ConversationSkeleton,
  FeedSkeleton,
  SettingsSkeleton,
  Skeleton,
} from '@/components/skeletons';

export function SkeletonShowcase() {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Base Skeleton</ThemedText>
        <Skeleton width={200} height={20} />
        <Skeleton width={150} height={16} style={styles.spacing} />
        <Skeleton width={100} height={16} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Post Card Skeleton</ThemedText>
        <PostCardSkeleton />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Profile Header Skeleton</ThemedText>
        <ProfileHeaderSkeleton />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Search Result Skeleton</ThemedText>
        <SearchResultSkeleton />
        <SearchResultSkeleton />
        <SearchResultSkeleton />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Notification Skeleton</ThemedText>
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Conversation Skeleton</ThemedText>
        <ConversationSkeleton />
        <ConversationSkeleton />
        <ConversationSkeleton />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Feed Skeleton</ThemedText>
        <FeedSkeleton count={3} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Settings Skeleton</ThemedText>
        <SettingsSkeleton />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  spacing: {
    marginTop: 8,
    marginBottom: 8,
  },
}); 