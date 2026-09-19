import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import type { Partner } from '@/lib/partners';
import { activeLabel } from '@/lib/time';
import type { Language } from '@/lib/types';

type Props = {
  partner: Partner;
  languages: Language[];
  onPress: () => void;
};

export function describeLanguages(partner: Partner, languages: Language[]) {
  const nameOf = (code: string) => languages.find((language) => language.code === code)?.name ?? code;
  const helps = partner.languages
    .filter((row) => row.kind !== 'learning')
    .map((row) => (row.kind === 'native' ? `${nameOf(row.language_code)} (${strings.profile.nativeTag})` : nameOf(row.language_code)));
  const practising = partner.languages
    .filter((row) => row.kind === 'learning')
    .map((row) => (row.level ? `${nameOf(row.language_code)} · ${strings.levels[row.level].title}` : nameOf(row.language_code)));
  return { helps: helps.join(', '), practising: practising.join(', ') };
}

export function PartnerCard({ partner, languages, onPress }: Props) {
  const { helps, practising } = describeLanguages(partner, languages);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Avatar color={partner.avatar_color} name={partner.display_name} size={56} />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Body style={styles.name} numberOfLines={1}>
            {partner.display_name}
          </Body>
          <Muted style={styles.active}>{activeLabel(partner.last_active_at)}</Muted>
        </View>
        <Muted numberOfLines={1}>
          {strings.partners.helpsWith}: {helps}
        </Muted>
        <Muted numberOfLines={1}>
          {strings.partners.practising}: {practising}
        </Muted>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontWeight: '600', flexShrink: 1 },
  active: { fontSize: 12 },
});
