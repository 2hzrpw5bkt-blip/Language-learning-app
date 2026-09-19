import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { LanguageSummary } from '@/components/language-summary';
import { Screen } from '@/components/screen';
import { Body, ErrorText, Muted, Title } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { blockUser, startConversation } from '@/lib/chat';
import { useChats } from '@/lib/chat-context';
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
  const router = useRouter();
  const { session, languages } = useAuth();
  const { conversations, reload } = useChats();
  const me = session?.user.id ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [starting, setStarting] = useState(false);

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
  // If we already chat, the button opens that chat instead of starting a new one.
  const existing = conversations.find((item) => item.other_id === partner.id);

  const sayHi = async () => {
    setStarting(true);
    try {
      const conversationId = await startConversation(partner.id);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    } catch (caught) {
      Alert.alert(strings.chats.startFailed, errorMessage(caught));
    } finally {
      setStarting(false);
    }
  };

  const confirmBlock = () => {
    Alert.alert(strings.chats.blockTitle(partner.display_name), strings.chats.blockBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.chats.blockConfirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(me, partner.id);
            await reload();
            router.back();
          } catch (caught) {
            Alert.alert(errorMessage(caught));
          }
        },
      },
    ]);
  };

  const openMenu = () => {
    Alert.alert(partner.display_name, undefined, [
      {
        text: strings.chats.report,
        onPress: () => router.push({ pathname: '/report', params: { userId: partner.id } }),
      },
      { text: strings.chats.block, style: 'destructive', onPress: confirmBlock },
      { text: strings.common.cancel, style: 'cancel' },
    ]);
  };

  const rows = partner.languages.map((row) => ({ ...row, user_id: partner.id }));
  const helps = rows.filter((row) => row.kind !== 'learning');
  const practising = rows.filter((row) => row.kind === 'learning');

  return (
    <Screen
      footer={
        <Button
          title={existing ? strings.partners.openChat : strings.partners.sayHi}
          onPress={sayHi}
          loading={starting}
        />
      }>
      <Stack.Screen
        options={{
          title: partner.display_name,
          headerRight: () => (
            <Pressable onPress={openMenu} hitSlop={8} accessibilityLabel={strings.chats.menu}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
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
