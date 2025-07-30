import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export function SettingsSkeleton() {
  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <ThemedView style={styles.container}>
      {/* Account section */}
      <View style={styles.section}>
        <Skeleton width={100} height={20} style={styles.sectionTitle} />
        <View style={[styles.sectionContent, { borderBottomColor: borderColor }]}>
          <View style={styles.settingItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={120} height={16} style={styles.settingText} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
          <View style={styles.settingItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={100} height={16} style={styles.settingText} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
        </View>
      </View>

      {/* Preferences section */}
      <View style={styles.section}>
        <Skeleton width={120} height={20} style={styles.sectionTitle} />
        <View style={[styles.sectionContent, { borderBottomColor: borderColor }]}>
          <View style={styles.settingItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={140} height={16} style={styles.settingText} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
          <View style={styles.settingItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={110} height={16} style={styles.settingText} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
          <View style={styles.settingItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={130} height={16} style={styles.settingText} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
        </View>
      </View>

      {/* About section */}
      <View style={styles.section}>
        <Skeleton width={80} height={20} style={styles.sectionTitle} />
        <View style={styles.sectionContent}>
          <View style={styles.settingItem}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={90} height={16} style={styles.settingText} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    opacity: 0.8,
  },
  sectionContent: {
    borderBottomWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
}); 