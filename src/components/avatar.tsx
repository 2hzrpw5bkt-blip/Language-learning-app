import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_AVATAR_COLOR } from '@/constants/avatar-colors';
import { colors } from '@/constants/theme';

type Props = {
  color: string | null | undefined;
  name: string;
  size?: number;
};

// A coloured circle with the first letter of the name. No photos in v1.
export function Avatar({ color, name, size = 96 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || DEFAULT_AVATAR_COLOR }]}
      accessibilityLabel={name}>
      <Text style={[styles.initial, { fontSize: size / 2.5 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.onPrimary, fontWeight: '700' },
});
