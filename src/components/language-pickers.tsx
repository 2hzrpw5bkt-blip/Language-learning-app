// Two pickers: the languages a user speaks (with a "native" switch) and the ones they learn (with a level).
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '@/components/checkbox';
import { Body } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { CEFR_LEVELS, type CefrLevel, type Language, type LearnChoices, type SpeakChoices } from '@/lib/types';

type RowProps = {
  language: Language;
  selected: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

function LanguageRow({ language, selected, onToggle, children }: RowProps) {
  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        onPress={onToggle}
        style={styles.rowHeader}>
        <Body style={styles.rowName}>{language.name}</Body>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={selected ? colors.primary : colors.border}
        />
      </Pressable>
      {selected && children ? <View style={styles.rowDetail}>{children}</View> : null}
    </View>
  );
}

type SpeakProps = {
  languages: Language[];
  exclude?: string[];
  value: SpeakChoices;
  onChange: (next: SpeakChoices) => void;
};

export function SpeakLanguagePicker({ languages, exclude = [], value, onChange }: SpeakProps) {
  return (
    <View style={styles.list}>
      {languages
        .filter((language) => !exclude.includes(language.code))
        .map((language) => {
          const choice = value[language.code];
          return (
            <LanguageRow
              key={language.code}
              language={language}
              selected={choice !== undefined}
              onToggle={() => {
                const next = { ...value };
                if (choice) {
                  delete next[language.code];
                } else {
                  next[language.code] = { native: false };
                }
                onChange(next);
              }}>
              <Checkbox
                checked={choice?.native ?? false}
                onChange={(native) => onChange({ ...value, [language.code]: { native } })}>
                <Body>{strings.onboarding.native}</Body>
              </Checkbox>
            </LanguageRow>
          );
        })}
    </View>
  );
}

type LearnProps = {
  languages: Language[];
  exclude?: string[];
  value: LearnChoices;
  onChange: (next: LearnChoices) => void;
};

export function LearnLanguagePicker({ languages, exclude = [], value, onChange }: LearnProps) {
  return (
    <View style={styles.list}>
      {languages
        .filter((language) => !exclude.includes(language.code))
        .map((language) => {
          const selected = language.code in value;
          return (
            <LanguageRow
              key={language.code}
              language={language}
              selected={selected}
              onToggle={() => {
                const next = { ...value };
                if (selected) {
                  delete next[language.code];
                } else {
                  next[language.code] = null;
                }
                onChange(next);
              }}>
              <LevelPicker
                value={value[language.code] ?? null}
                onChange={(level) => onChange({ ...value, [language.code]: level })}
              />
            </LanguageRow>
          );
        })}
    </View>
  );
}

function LevelPicker({ value, onChange }: { value: CefrLevel | null; onChange: (level: CefrLevel) => void }) {
  return (
    <View style={styles.levels}>
      {CEFR_LEVELS.map((level) => {
        const active = level === value;
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={strings.levels[level]}
            onPress={() => onChange(level)}
            style={[styles.level, active && styles.levelActive]}>
            <Text style={[styles.levelText, active && styles.levelTextActive]}>{level}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rowSelected: { borderColor: colors.primary },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rowName: { fontWeight: '600' },
  rowDetail: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  levels: { flexDirection: 'row', gap: spacing.xs },
  level: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  levelActive: { backgroundColor: colors.primary },
  levelText: { fontWeight: '600', color: colors.text },
  levelTextActive: { color: colors.onPrimary },
});
