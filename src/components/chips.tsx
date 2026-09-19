// A single-choice row of pills, scrolls sideways when there are many.
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export type ChipOption<T extends string | null> = { value: T; label: string };

type Props<T extends string | null> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

export function Chips<T extends string | null>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary },
  label: { fontWeight: '600', color: colors.text },
  labelActive: { color: colors.onPrimary },
});
