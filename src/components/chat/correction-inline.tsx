// The corrected version of a message, shown inside the original bubble with changes highlighted.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { wordDiff } from '@/lib/diff';

type Props = {
  original: string;
  corrected: string;
  byName: string;
};

export function CorrectionInline({ original, corrected, byName }: Props) {
  const segments = wordDiff(original, corrected);
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Ionicons name="pencil" size={12} color={colors.correction} />
        <Text style={styles.label}>{strings.chats.correctionBy(byName)}</Text>
      </View>
      <Text style={styles.text}>
        {segments.map((segment, index) => {
          const space = index < segments.length - 1 ? ' ' : '';
          if (segment.kind === 'removed') {
            return (
              <Text key={index} style={styles.removed}>
                {segment.text}
                {space}
              </Text>
            );
          }
          if (segment.kind === 'added') {
            return (
              <Text key={index} style={styles.added}>
                {segment.text}
                {space}
              </Text>
            );
          }
          return (
            <Text key={index}>
              {segment.text}
              {space}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.correction,
    gap: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '700', color: colors.correction },
  text: { fontSize: 16, lineHeight: 22, color: colors.text },
  removed: { color: colors.muted, textDecorationLine: 'line-through' },
  added: { color: colors.correction, fontWeight: '700', backgroundColor: colors.correctionHighlight },
});
