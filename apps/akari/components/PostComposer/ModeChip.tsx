import { Pressable } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

import { styles } from './styles';

type ModeChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  borderColor: string;
  tintColor: string;
  textColor: string;
};

export function ModeChip({ label, active, onPress, borderColor, tintColor, textColor }: ModeChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeChip,
        {
          borderColor: active ? tintColor : borderColor,
          backgroundColor: active ? tintColor : 'transparent',
        },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <ThemedText
        style={[
          styles.modeChipText,
          { color: active ? '#000000' : textColor },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
