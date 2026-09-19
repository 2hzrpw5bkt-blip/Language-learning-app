// Two pickers: the languages a user wants to practise (with a level) and the ones they can help with
// (with a "native" switch). A language picked in one picker shows greyed out in the other.
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '@/components/checkbox';
import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { SKILL_LEVELS, type Language, type LearnChoices, type SkillLevel, type TeachChoices } from '@/lib/types';

type RowProps = {
  language: Language;
  selected: boolean;
  // When set, the row cannot be picked and shows this text instead.
  lockedReason?: string;
  onToggle: () => void;
  children?: ReactNode;
};

function LanguageRow({ language, selected, lockedReason, onToggle, children }: RowProps) {
  if (lockedReason) {
    return (
      <View style={[styles.row, styles.rowLocked]}>
        <View style={styles.rowHeader}>
          <Body style={[styles.rowName, styles.lockedText]}>{language.name}</Body>
          <Muted>{lockedReason}</Muted>
        </View>
      </View>
    );
  }
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

type LearnProps = {
  languages: Language[];
  // Codes already picked as "can help with"; shown locked.
  locked?: string[];
  value: LearnChoices;
  onChange: (next: LearnChoices) => void;
};

export function LearnLanguagePicker({ languages, locked = [], value, onChange }: LearnProps) {
  return (
    <View style={styles.list}>
      {languages.map((language) => {
        const selected = language.code in value;
        return (
          <LanguageRow
            key={language.code}
            language={language}
            selected={selected}
            lockedReason={locked.includes(language.code) ? strings.onboarding.pickedAsTeaching : undefined}
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

type TeachProps = {
  languages: Language[];
  // Codes already picked as "practising"; shown locked.
  locked?: string[];
  value: TeachChoices;
  onChange: (next: TeachChoices) => void;
};

export function TeachLanguagePicker({ languages, locked = [], value, onChange }: TeachProps) {
  return (
    <View style={styles.list}>
      {languages.map((language) => {
        const choice = value[language.code];
        return (
          <LanguageRow
            key={language.code}
            language={language}
            selected={choice !== undefined}
            lockedReason={locked.includes(language.code) ? strings.onboarding.pickedAsLearning : undefined}
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

function LevelPicker({ value, onChange }: { value: SkillLevel | null; onChange: (level: SkillLevel) => void }) {
  return (
    <View style={styles.levels}>
      {SKILL_LEVELS.map((level) => {
        const active = level === value;
        const label = strings.levels[level];
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(level)}
            style={[styles.level, active && styles.levelActive]}>
            <Text style={[styles.levelTitle, active && styles.levelTextActive]}>{label.title}</Text>
            <Text style={[styles.levelHelp, active && styles.levelTextActive]}>{label.help}</Text>
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
  rowLocked: { backgroundColor: colors.surface, borderColor: colors.surface },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowName: { fontWeight: '600' },
  lockedText: { color: colors.muted },
  rowDetail: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  levels: { gap: spacing.xs },
  level: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  levelActive: { backgroundColor: colors.primary },
  levelTitle: { fontWeight: '600', color: colors.text },
  levelHelp: { fontSize: 13, color: colors.muted },
  levelTextActive: { color: colors.onPrimary },
});
