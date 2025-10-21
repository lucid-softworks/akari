import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

import type { Timeframe } from '@/hooks/queries/useActivityChart';

type TimeframeDropdownProps = {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
};

const timeframes: { key: Timeframe; label: string }[] = [
  { key: '1d', label: 'Last day' },
  { key: '3d', label: 'Last 3 days' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

export function TimeframeDropdown({ selectedTimeframe, onTimeframeChange }: TimeframeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const selectedLabel = timeframes.find((tf) => tf.key === selectedTimeframe)?.label || 'Last 3 days';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, { borderColor }]} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.7}>
        <ThemedText style={styles.buttonText}>{selectedLabel}</ThemedText>
        <IconSymbol name={isOpen ? 'chevron.up' : 'chevron.down'} size={12} color={textColor} />
      </TouchableOpacity>

      {isOpen && (
        <ThemedView style={[styles.dropdown, { borderColor, backgroundColor }]}>
          {timeframes.map((timeframe) => (
            <TouchableOpacity
              key={timeframe.key}
              style={[
                styles.option,
                selectedTimeframe === timeframe.key && styles.selectedOption,
                { borderBottomColor: borderColor },
              ]}
              onPress={() => {
                onTimeframeChange(timeframe.key);
                setIsOpen(false);
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.optionText, selectedTimeframe === timeframe.key && styles.selectedOptionText]}>
                {timeframe.label}
              </ThemedText>
              {selectedTimeframe === timeframe.key && <IconSymbol name="checkmark" size={14} color={textColor} />}
            </TouchableOpacity>
          ))}
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 9999,
    elevation: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    opacity: 0.7,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  optionText: {
    fontSize: 14,
  },
  selectedOptionText: {
    fontWeight: '600',
  },
});
