import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { LanguageSummary } from '@/components/language-summary';
import { Screen } from '@/components/screen';
import { Body, ErrorText, Muted, Title } from '@/components/typography';
import { strings } from '@/constants/strings';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { fetchPartner, type Partner } from '@/lib/partners';
import { activeLabel } from '@/lib/time';

type State = { kind: 'loading' } | { kind: 'ok'; partner: Partner } | { kind: 'error'; message: string };

async function load(id: string): Promise<State> {
  try {
    const partner = await fetchPartner(id);
    return partner ? { kind: 'ok', partner } : { kind: 'error', message: strings.partners.notFound };
  } catch (caught) {
    return { kind: 'error', message: errorMessage(caught) };
  }
}

export default function PartnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { languages } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    load(id).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.kind === 'error') {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ErrorText message={state.message} />
      </Screen>
    );
  }
  if (state.kind === 'loading') {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Muted>{strings.common.loading}</Muted>
      </Screen>
    );
  }

  const { partner } = state;
  const rows = partner.languages.map((row) => ({ ...row, user_id: partner.id }));
  const helps = rows.filter((row) => row.kind !== 'learning');
  const practising = rows.filter((row) => row.kind === 'learning');

  return (
    <Screen footer={<Button title={strings.partners.sayHi} onPress={() => Alert.alert(strings.partners.sayHiSoon)} />}>
      <Stack.Screen options={{ title: partner.display_name }} />
      <View style={styles.header}>
        <Avatar url={partner.avatar_url} name={partner.display_name} />
        <Title>{partner.display_name}</Title>
        <Muted>{activeLabel(partner.last_active_at)}</Muted>
      </View>
      <Body>{partner.bio || strings.profile.noBio}</Body>
      <Muted>
        {strings.profile.timezone}: {partner.timezone}
      </Muted>
      <LanguageSummary title={strings.partners.helpsWith} rows={helps} languages={languages} />
      <LanguageSummary title={strings.partners.practising} rows={practising} languages={languages} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm },
});
