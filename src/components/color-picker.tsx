import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AVATAR_COLORS } from '@/constants/avatar-colors';
import { colors, spacing } from '@/constants/theme';

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {AVATAR_COLORS.map((color) => {
        const active = color.value.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color.value}
            accessibilityRole="radio"
            accessibilityLabel={color.name}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(color.value)}
            style={[styles.swatch, { backgroundColor: color.value }, active && styles.active]}>
            {active ? <Ionicons name="checkmark" size={20} color={colors.onPrimary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  active: { borderWidth: 3, borderColor: colors.text },
});
