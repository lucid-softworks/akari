import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type BiggestFansProps = {
  fans: {
    handle: string;
    displayName: string;
    avatar: string;
  }[];
  onFanPress?: (handle: string) => void;
};

export function BiggestFans({ fans, onFanPress }: BiggestFansProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <ThemedText style={styles.title}>BIGGEST FANS</ThemedText>
      <View style={styles.fansContainer}>
        {fans.map((fan, index) => (
          <TouchableOpacity
            key={fan.handle}
            style={styles.fanItem}
            onPress={() => onFanPress?.(fan.handle)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: fan.avatar }}
                style={styles.avatar}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
            </View>
            <ThemedText style={styles.handle} numberOfLines={1}>
              {fan.displayName || fan.handle}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  fansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fanItem: {
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
  },
  handle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
});
