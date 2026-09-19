import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  url: string | null;
  name: string;
  size?: number;
};

export function Avatar({ url, name, size = 96 }: Props) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return <Image source={{ uri: url }} style={[styles.image, round]} accessibilityLabel={name} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.placeholder, round]} accessibilityLabel={name}>
      <Text style={[styles.initial, { fontSize: size / 2.5 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface },
  placeholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.onPrimary, fontWeight: '700' },
});
