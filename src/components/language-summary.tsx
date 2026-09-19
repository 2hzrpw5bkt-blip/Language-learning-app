// Read-only list of a user's languages, used on the home and profile screens.
import { StyleSheet, Text, View } from 'react-native';

import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import type { Language, UserLanguage } from '@/lib/types';

type Props = {
  title: string;
  rows: UserLanguage[];
  languages: Language[];
};

export function LanguageSummary({ title, rows, languages }: Props) {
  const nameOf = (code: string) => languages.find((language) => language.code === code)?.name ?? code;
  return (
    <View style={styles.block}>
      <Muted>{title}</Muted>
      {rows.length === 0 ? <Body>—</Body> : null}
      {rows.map((row) => (
        <View key={row.language_code} style={styles.line}>
          <Body>{nameOf(row.language_code)}</Body>
          {row.kind === 'native' ? <Text style={styles.tag}>{strings.profile.nativeTag}</Text> : null}
          {row.level ? <Text style={styles.tag}>{strings.levels[row.level].title}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
