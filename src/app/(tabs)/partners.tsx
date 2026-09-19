import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Chips, type ChipOption } from '@/components/chips';
import { PartnerCard } from '@/components/partner-card';
import { Body, ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { findPartners, type Partner, type PartnerFilters } from '@/lib/partners';
import { SKILL_LEVELS, type SkillLevel } from '@/lib/types';

type Result = { partners: Partner[]; error: string | null };

async function load(filters: PartnerFilters): Promise<Result> {
  try {
    return { partners: await findPartners(filters), error: null };
  } catch (caught) {
    return { partners: [], error: errorMessage(caught) };
  }
}

export default function PartnersScreen() {
  const router = useRouter();
  const { userLanguages, languages } = useAuth();
  const [language, setLanguage] = useState<string | null>(null);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped to reload with the same filters (pull to refresh, coming back to the tab).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load({ language, level }).then((next) => {
      if (!cancelled) {
        setResult(next);
        setRefreshing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language, level, reloadKey]);

  useFocusEffect(
    useCallback(() => {
      setReloadKey((key) => key + 1);
    }, []),
  );

  const refresh = () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  };

  // Filter options come from my own languages: I can only be matched on those.
  const languageOptions: ChipOption<string | null>[] = [
    { value: null, label: strings.partners.anyLanguage },
    ...userLanguages
      .filter((row) => row.kind === 'learning')
      .map((row) => ({
        value: row.language_code,
        label: languages.find((item) => item.code === row.language_code)?.name ?? row.language_code,
      })),
  ];
  const levelOptions: ChipOption<SkillLevel | null>[] = [
    { value: null, label: strings.partners.anyLevel },
    ...SKILL_LEVELS.map((item) => ({ value: item, label: strings.levels[item].title })),
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={result?.partners ?? []}
        keyExtractor={(partner) => partner.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Muted>{strings.partners.intro}</Muted>
            <Muted style={styles.filterLabel}>{strings.partners.languageFilterLabel}</Muted>
            <Chips
              options={languageOptions}
              value={language}
              onChange={setLanguage}
              accessibilityLabel={strings.partners.languageFilterLabel}
            />
            <Muted style={styles.filterLabel}>{strings.partners.levelFilterLabel}</Muted>
            <Chips
              options={levelOptions}
              value={level}
              onChange={setLevel}
              accessibilityLabel={strings.partners.levelFilterLabel}
            />
            <ErrorText message={result?.error ?? null} />
          </View>
        }
        ListEmptyComponent={
          result && !result.error ? <Body style={styles.empty}>{strings.partners.empty}</Body> : null
        }
        renderItem={({ item }) => (
          <PartnerCard
            partner={item}
            languages={languages}
            onPress={() => router.push({ pathname: '/partner/[id]', params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  filterLabel: { marginTop: spacing.sm, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl },
});
